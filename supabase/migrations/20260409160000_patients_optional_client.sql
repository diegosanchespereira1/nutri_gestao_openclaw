-- Story 2.1b — Pacientes PF independentes de cliente
-- Torna client_id opcional (nullable) e adiciona user_id directo para RLS.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Tornar client_id nullable
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.patients
  alter column client_id drop not null;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Adicionar user_id (tenant key directo)
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.patients
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Backfill: copiar owner_user_id do cliente associado
update public.patients p
set user_id = c.owner_user_id
from public.clients c
where c.id = p.client_id
  and p.user_id is null;

-- Tornar NOT NULL após backfill (exige que todos os registos existentes tenham cliente)
alter table public.patients
  alter column user_id set not null;

-- Índice de suporte ao RLS
create index if not exists patients_user_id_idx on public.patients (user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Recriar RLS policies — usam user_id directamente
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "patients_select_own" on public.patients;
drop policy if exists "patients_insert_own" on public.patients;
drop policy if exists "patients_update_own" on public.patients;
drop policy if exists "patients_delete_own" on public.patients;

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "patients_delete_own"
  on public.patients for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Actualizar trigger de vínculo para aceitar client_id NULL
--    (paciente independente — sem cliente associado)
-- ──────────────────────────────────────────────────────────────────────────────
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
  -- Paciente independente (sem cliente): não há validação de kind/estabelecimento.
  if new.client_id is null then
    if new.establishment_id is not null then
      raise exception 'Paciente sem cliente não pode ter estabelecimento';
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

  return new;
end;
$$;
