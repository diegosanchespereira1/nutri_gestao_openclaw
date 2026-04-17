-- Histórico de estabelecimentos recentes na tela de checklists (por usuário).

create table if not exists public.checklist_establishment_recent (
  user_id uuid not null references auth.users (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_establishment_recent_pkey primary key (user_id, establishment_id)
);

create index if not exists checklist_establishment_recent_user_last_opened_idx
  on public.checklist_establishment_recent (user_id, last_opened_at desc);

alter table public.checklist_establishment_recent enable row level security;

create policy "checklist_establishment_recent_select_own"
  on public.checklist_establishment_recent for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "checklist_establishment_recent_insert_own"
  on public.checklist_establishment_recent for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.establishments e
      inner join public.clients c
        on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "checklist_establishment_recent_update_own"
  on public.checklist_establishment_recent for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.establishments e
      inner join public.clients c
        on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "checklist_establishment_recent_delete_own"
  on public.checklist_establishment_recent for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete
  on public.checklist_establishment_recent
  to authenticated;

create or replace function public.checklist_establishment_recent_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_establishment_recent_set_updated_at on public.checklist_establishment_recent;

create trigger checklist_establishment_recent_set_updated_at
before update on public.checklist_establishment_recent
for each row
execute function public.checklist_establishment_recent_touch_updated_at ();
