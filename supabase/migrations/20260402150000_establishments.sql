-- Estabelecimentos por cliente PJ — Story 2.2; tipos alinhados ao PRD (FR7).

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  establishment_type text not null,
  address_line1 text not null,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishments_type_check check (
    establishment_type in (
      'escola',
      'hospital',
      'clinica',
      'lar_idosos',
      'empresa'
    )
  ),
  constraint establishments_state_len check (
    state is null or char_length(state) = 2
  )
);

create index if not exists establishments_client_created_idx on public.establishments (client_id, created_at desc);

alter table public.establishments enable row level security;

create policy "establishments_select_own"
  on public.establishments for select
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

create policy "establishments_insert_own"
  on public.establishments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "establishments_update_own"
  on public.establishments for update
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
        and c.kind = 'pj'
    )
  );

create policy "establishments_delete_own"
  on public.establishments for delete
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

-- Reforço: apenas clientes PJ (além do with check em insert/update).
create or replace function public.establishments_enforce_pj_client ()
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
    raise exception 'Estabelecimentos só são permitidos para clientes pessoa jurídica';
  end if;
  return new;
end;
$$;

drop trigger if exists establishments_enforce_pj_client_bi on public.establishments;

create trigger establishments_enforce_pj_client_bi
before insert or update on public.establishments
for each row
execute function public.establishments_enforce_pj_client ();

create or replace function public.establishments_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists establishments_set_updated_at on public.establishments;

create trigger establishments_set_updated_at
before update on public.establishments
for each row
execute function public.establishments_touch_updated_at ();

grant select, insert, update, delete on public.establishments to authenticated;
