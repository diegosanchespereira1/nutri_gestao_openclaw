-- Profissional responsável pela carteira (cliente / paciente) + actor em auditoria.

-- ── 1. audit_log: quem executou a mutação (além do user_id = tenant) ───────────
alter table public.audit_log
  add column if not exists actor_user_id uuid references auth.users (id) on delete set null;

create index if not exists audit_log_actor_user_id_idx
  on public.audit_log (actor_user_id)
  where actor_user_id is not null;

-- Membros do workspace podem ler logs do tenant (titular).
drop policy if exists "audit_log_select_workspace" on public.audit_log;
create policy "audit_log_select_workspace"
  on public.audit_log for select
  to authenticated
  using (user_id = (select public.workspace_account_owner_id()));

-- ── 2. Colunas FK (opcional) ──────────────────────────────────────────────────
alter table public.clients
  add column if not exists responsible_team_member_id uuid references public.team_members (id) on delete set null;

alter table public.patients
  add column if not exists responsible_team_member_id uuid references public.team_members (id) on delete set null;

create index if not exists clients_responsible_team_member_idx
  on public.clients (responsible_team_member_id)
  where responsible_team_member_id is not null;

create index if not exists patients_responsible_team_member_idx
  on public.patients (responsible_team_member_id)
  where responsible_team_member_id is not null;

-- ── 3. Validação: membro pertence ao mesmo workspace ──────────────────────────
create or replace function public.clients_validate_responsible_team_member ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsible_team_member_id is not null then
    if not exists (
      select 1
      from public.team_members tm
      where
        tm.id = new.responsible_team_member_id
        and tm.owner_user_id = new.owner_user_id
    ) then
      raise exception 'Membro da equipe responsável inválido para este cliente';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_validate_responsible_bi on public.clients;
create trigger clients_validate_responsible_bi
before insert or update on public.clients
for each row
execute function public.clients_validate_responsible_team_member ();

create or replace function public.patients_validate_responsible_team_member ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsible_team_member_id is not null then
    if not exists (
      select 1
      from public.team_members tm
      where
        tm.id = new.responsible_team_member_id
        and tm.owner_user_id = new.user_id
    ) then
      raise exception 'Membro da equipe responsável inválido para este paciente';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists patients_validate_responsible_bi on public.patients;
create trigger patients_validate_responsible_bi
before insert or update on public.patients
for each row
execute function public.patients_validate_responsible_team_member ();

-- ── 4. audit_log_trigger: preencher actor_user_id ─────────────────────────────
create or replace function public.audit_log_trigger ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_masked jsonb;
  new_masked jsonb;
begin
  old_masked := case
    when tg_op = 'DELETE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    else null
  end;

  new_masked := case
    when tg_op = 'INSERT' then mask_sensitive_fields(row_to_json(new)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(new)::jsonb)
    else null
  end;

  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    case
      when tg_op = 'DELETE' then (old.user_id)::uuid
      when tg_op = 'UPDATE' then (new.user_id)::uuid
      when tg_op = 'INSERT' then (new.user_id)::uuid
    end,
    tg_table_name,
    tg_op,
    case
      when tg_op = 'DELETE' then (old.id)::uuid
      else (new.id)::uuid
    end,
    old_masked,
    new_masked,
    now() + interval '12 months',
    auth.uid()
  );

  return case
    when tg_op = 'DELETE' then old
    else new
  end;
end;
$$;

-- ── 5. Auditoria em clients (payload focado) ─────────────────────────────────
create or replace function public.audit_clients_row_json (c public.clients)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id,
    'legal_name', c.legal_name,
    'kind', c.kind,
    'responsible_team_member_id', c.responsible_team_member_id
  );
$$;

create or replace function public.audit_clients_ai ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.owner_user_id,
    'clients',
    'INSERT',
    new.id,
    null,
    public.audit_clients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_clients_au ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.owner_user_id,
    'clients',
    'UPDATE',
    new.id,
    public.audit_clients_row_json(old),
    public.audit_clients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_clients_ad ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    old.owner_user_id,
    'clients',
    'DELETE',
    old.id,
    public.audit_clients_row_json(old),
    null,
    now() + interval '12 months',
    auth.uid()
  );
  return old;
end;
$$;

drop trigger if exists audit_clients_ai on public.clients;
create trigger audit_clients_ai
after insert on public.clients
for each row
execute function public.audit_clients_ai ();

drop trigger if exists audit_clients_au on public.clients;
create trigger audit_clients_au
after update on public.clients
for each row
execute function public.audit_clients_au ();

drop trigger if exists audit_clients_ad on public.clients;
create trigger audit_clients_ad
after delete on public.clients
for each row
execute function public.audit_clients_ad ();
