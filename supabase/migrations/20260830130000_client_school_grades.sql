-- Séries/turmas por escola (cliente PJ com categoria "escola") — permite ao
-- profissional cadastrar as séries de uma escola (ex.: "Maternal II", "3º
-- ano B") e, opcionalmente, associar cada paciente daquele cliente a uma
-- dessas séries. Reaproveita o cadastro de Clientes já existente (categoria
-- "escola" em business_segment) em vez de criar uma entidade "Escola" à parte.

-- ── client_school_grades ─────────────────────────────────────────────────────

create table if not exists public.client_school_grades (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.clients (id) on delete cascade,
  name        text        not null check (char_length(trim(name)) between 1 and 80),
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint client_school_grades_client_name_unique unique (client_id, name)
);

comment on table public.client_school_grades is
  'Séries/turmas cadastradas por um cliente PJ (tipicamente categoria "escola"). '
  'Pacientes desse cliente podem, opcionalmente, ser associados a uma série.';

create index if not exists client_school_grades_client_idx
  on public.client_school_grades (client_id, position);

alter table public.client_school_grades enable row level security;

create policy "client_school_grades_select_own"
  on public.client_school_grades for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "client_school_grades_insert_own"
  on public.client_school_grades for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "client_school_grades_update_own"
  on public.client_school_grades for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "client_school_grades_delete_own"
  on public.client_school_grades for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

-- Reforço: apenas clientes PJ (além do with check em insert/update).
create or replace function public.client_school_grades_enforce_pj_client ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  select c.kind into k from public.clients c where c.id = new.client_id;
  if k is null then
    raise exception 'Cliente inexistente';
  end if;
  if k <> 'pj' then
    raise exception 'Séries só são permitidas para clientes pessoa jurídica';
  end if;
  return new;
end;
$$;

drop trigger if exists client_school_grades_enforce_pj_client_bi on public.client_school_grades;

create trigger client_school_grades_enforce_pj_client_bi
before insert or update on public.client_school_grades
for each row
execute function public.client_school_grades_enforce_pj_client ();

create or replace function public.client_school_grades_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_school_grades_set_updated_at on public.client_school_grades;

create trigger client_school_grades_set_updated_at
before update on public.client_school_grades
for each row
execute function public.client_school_grades_touch_updated_at ();

grant select, insert, update, delete on public.client_school_grades to authenticated;

-- Funções internas (triggers) — sem chamada directa da aplicação, segue o
-- endurecimento já aplicado às demais funções de trigger do domínio.
revoke execute on function public.client_school_grades_enforce_pj_client () from public;
revoke execute on function public.client_school_grades_enforce_pj_client () from anon;
revoke execute on function public.client_school_grades_enforce_pj_client () from authenticated;
revoke execute on function public.client_school_grades_touch_updated_at () from public;
revoke execute on function public.client_school_grades_touch_updated_at () from anon;
revoke execute on function public.client_school_grades_touch_updated_at () from authenticated;

-- ── patients.school_grade_id ─────────────────────────────────────────────────
-- Campo opcional: paciente pode (ou não) estar associado a uma série da
-- escola (cliente) à qual pertence.

alter table public.patients
  add column if not exists school_grade_id uuid references public.client_school_grades (id) on delete set null;

create index if not exists patients_school_grade_idx
  on public.patients (school_grade_id)
  where school_grade_id is not null;

-- Actualiza o trigger de vínculo do paciente para validar a série (se informada):
-- precisa pertencer ao mesmo cliente do paciente; paciente sem cliente (ou
-- cliente PF) não pode ter série.
create or replace function public.patients_enforce_vinculo ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ck text;
  est_client uuid;
  grade_client uuid;
begin
  -- Paciente independente (sem cliente): não há validação de kind/estabelecimento/série.
  if new.client_id is null then
    if new.establishment_id is not null then
      raise exception 'Paciente sem cliente não pode ter estabelecimento';
    end if;
    if new.school_grade_id is not null then
      raise exception 'Paciente sem cliente não pode ter série';
    end if;
    return new;
  end if;

  -- Paciente com cliente: validar kind e coerência estabelecimento.
  select c.kind into ck from public.clients c where c.id = new.client_id;
  if ck is null then
    raise exception 'Cliente inexistente';
  end if;

  if ck = 'pf' then
    if new.establishment_id is not null then
      raise exception 'Pacientes de cliente PF não podem ter estabelecimento';
    end if;
    if new.school_grade_id is not null then
      raise exception 'Pacientes de cliente PF não podem ter série';
    end if;
  elsif ck = 'pj' then
    if new.establishment_id is null then
      raise exception 'Pacientes de cliente PJ devem estar ligados a um estabelecimento';
    end if;
    select e.client_id into est_client
    from public.establishments e
    where e.id = new.establishment_id;
    if est_client is null or est_client <> new.client_id then
      raise exception 'Estabelecimento inválido para este cliente';
    end if;
  end if;

  -- Série (opcional): se informada, precisa pertencer ao mesmo cliente do paciente.
  if new.school_grade_id is not null then
    select g.client_id into grade_client
    from public.client_school_grades g
    where g.id = new.school_grade_id;
    if grade_client is null or grade_client <> new.client_id then
      raise exception 'Série inválida para este cliente';
    end if;
  end if;

  return new;
end;
$$;
