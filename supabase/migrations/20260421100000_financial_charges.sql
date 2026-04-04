-- Pendências financeiras (Story 5.3 / base Épico 8) — cobranças por cliente, RLS por tenant.

create table if not exists public.financial_charges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  description text not null default '',
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  status text not null default 'open',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_charges_status_check check (status in ('open', 'paid'))
);

create index if not exists financial_charges_owner_due_idx
  on public.financial_charges (owner_user_id, due_date);

create index if not exists financial_charges_owner_status_due_idx
  on public.financial_charges (owner_user_id, status, due_date);

alter table public.financial_charges enable row level security;

create policy "financial_charges_select_own"
  on public.financial_charges for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "financial_charges_insert_own"
  on public.financial_charges for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "financial_charges_update_own"
  on public.financial_charges for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "financial_charges_delete_own"
  on public.financial_charges for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.financial_charges_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists financial_charges_set_updated_at on public.financial_charges;

create trigger financial_charges_set_updated_at
before update on public.financial_charges
for each row
execute function public.financial_charges_touch_updated_at ();

grant select, insert, update, delete on public.financial_charges to authenticated;
