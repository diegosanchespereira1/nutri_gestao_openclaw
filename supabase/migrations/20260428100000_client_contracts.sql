-- Stories 8.2 (recorrência de cobrança) + 8.3 (datas de contrato)
-- Tabela de contratos por cliente, isolada por tenant (owner_user_id).

create table if not exists public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,

  -- Story 8.2 — recorrência
  billing_recurrence text not null default 'one-time',
  monthly_amount_cents bigint check (monthly_amount_cents is null or monthly_amount_cents > 0),

  -- Story 8.3 — datas de contrato
  contract_start_date date,
  contract_end_date date,

  -- Story 8.5 — alerta antecipado (dias antes do vencimento)
  alert_days_before int not null default 30,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_contracts_billing_recurrence_check
    check (billing_recurrence in ('monthly', 'annual', 'one-time')),
  constraint client_contracts_dates_check
    check (
      contract_end_date is null
      or contract_start_date is null
      or contract_end_date >= contract_start_date
    )
);

create index if not exists client_contracts_owner_client_idx
  on public.client_contracts (owner_user_id, client_id);

create index if not exists client_contracts_owner_end_date_idx
  on public.client_contracts (owner_user_id, contract_end_date)
  where contract_end_date is not null;

alter table public.client_contracts enable row level security;

create policy "client_contracts_select_own"
  on public.client_contracts for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "client_contracts_insert_own"
  on public.client_contracts for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "client_contracts_update_own"
  on public.client_contracts for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "client_contracts_delete_own"
  on public.client_contracts for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.client_contracts_touch_updated_at ()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_contracts_set_updated_at on public.client_contracts;

create trigger client_contracts_set_updated_at
before update on public.client_contracts
for each row
execute function public.client_contracts_touch_updated_at ();

grant select, insert, update, delete on public.client_contracts to authenticated;
