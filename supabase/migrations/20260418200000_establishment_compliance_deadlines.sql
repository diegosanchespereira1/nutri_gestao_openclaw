-- Story 5.2: prazos de compliance por estabelecimento (alertas no dashboard).

create table if not exists public.establishment_compliance_deadlines (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  title text not null,
  portaria_ref text,
  checklist_template_id uuid references public.checklist_templates (id) on delete set null,
  due_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishment_compliance_deadlines_title_trim check (
    char_length(trim(title)) > 0
  ),
  constraint establishment_compliance_deadlines_title_len check (
    char_length(title) <= 200
  )
);

create index if not exists establishment_compliance_deadlines_est_due_idx
  on public.establishment_compliance_deadlines (establishment_id, due_date asc);

create index if not exists establishment_compliance_deadlines_due_idx
  on public.establishment_compliance_deadlines (due_date asc);

comment on table public.establishment_compliance_deadlines is
  'Prazos regulatórios / portaria por estabelecimento; alimenta alertas no dashboard (FR51).';

alter table public.establishment_compliance_deadlines enable row level security;

create policy "establishment_compliance_deadlines_select_own"
  on public.establishment_compliance_deadlines for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "establishment_compliance_deadlines_insert_own"
  on public.establishment_compliance_deadlines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "establishment_compliance_deadlines_update_own"
  on public.establishment_compliance_deadlines for update
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "establishment_compliance_deadlines_delete_own"
  on public.establishment_compliance_deadlines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.establishment_compliance_deadlines to authenticated;

create or replace function public.establishment_compliance_deadlines_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists establishment_compliance_deadlines_set_updated_at
  on public.establishment_compliance_deadlines;

create trigger establishment_compliance_deadlines_set_updated_at
before update on public.establishment_compliance_deadlines
for each row
execute function public.establishment_compliance_deadlines_touch_updated_at ();
