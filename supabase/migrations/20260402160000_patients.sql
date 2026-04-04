-- Pacientes — Story 2.3 / FR8: PF sem estabelecimento; PJ obriga estabelecimento do mesmo cliente.

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  establishment_id uuid references public.establishments (id) on delete restrict,
  full_name text not null,
  birth_date date,
  document_id text,
  sex text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_sex_check check (
    sex is null or sex in ('female', 'male', 'other')
  )
);

create index if not exists patients_client_created_idx on public.patients (client_id, created_at desc);

create index if not exists patients_establishment_created_idx on public.patients (establishment_id, created_at desc);

create index if not exists patients_client_pf_idx on public.patients (client_id)
where
  establishment_id is null;

alter table public.patients enable row level security;

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "patients_delete_own"
  on public.patients for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.patients_enforce_vinculo ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ck text;
  est_client uuid;
begin
  select c.kind into ck from public.clients c where c.id = new.client_id;
  if ck is null then
    raise exception 'Cliente inexistente';
  end if;
  if ck = 'pf' then
    if new.establishment_id is not null then
      raise exception 'Pacientes de cliente PF não podem ter estabelecimento';
    end if;
  elsif ck = 'pj' then
    if new.establishment_id is null then
      raise exception 'Pacientes de cliente PJ devem estar ligados a um estabelecimento';
    end if;
    select e.client_id into est_client
    from public.establishments e
    where
      e.id = new.establishment_id;
    if est_client is null or est_client <> new.client_id then
      raise exception 'Estabelecimento inválido para este cliente';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists patients_enforce_vinculo_bi on public.patients;

create trigger patients_enforce_vinculo_bi
before insert or update on public.patients
for each row
execute function public.patients_enforce_vinculo ();

create or replace function public.patients_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;

create trigger patients_set_updated_at
before update on public.patients
for each row
execute function public.patients_touch_updated_at ();

grant select, insert, update, delete on public.patients to authenticated;
