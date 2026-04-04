-- Clientes PF/PJ — Story 2.1; isolamento por profissional (tenant = owner_user_id, FR61).

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  legal_name text not null,
  trade_name text,
  document_id text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_kind_check check (kind in ('pf', 'pj'))
);

create index if not exists clients_owner_created_idx on public.clients (owner_user_id, created_at desc);

create index if not exists clients_owner_legal_name_idx on public.clients (owner_user_id, legal_name);

alter table public.clients enable row level security;

create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.clients_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.clients_touch_updated_at ();

grant select, insert, update, delete on public.clients to authenticated;
