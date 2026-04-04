-- Agendamento de visitas — Story 4.1 (FR17).

create table if not exists public.scheduled_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  establishment_id uuid references public.establishments (id) on delete restrict,
  patient_id uuid references public.patients (id) on delete restrict,
  scheduled_start timestamptz not null,
  priority text not null default 'normal',
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_visits_target_type_check check (
    target_type in ('establishment', 'patient')
  ),
  constraint scheduled_visits_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint scheduled_visits_status_check check (
    status in ('scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  constraint scheduled_visits_target_fk_check check (
    (
      target_type = 'establishment'
      and establishment_id is not null
      and patient_id is null
    )
    or (
      target_type = 'patient'
      and patient_id is not null
      and establishment_id is null
    )
  )
);

create index if not exists scheduled_visits_user_start_idx
  on public.scheduled_visits (user_id, scheduled_start asc);

alter table public.scheduled_visits enable row level security;

create policy "scheduled_visits_select_own"
  on public.scheduled_visits for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "scheduled_visits_insert_own"
  on public.scheduled_visits for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        target_type = 'establishment'
        and exists (
          select 1
          from public.establishments e
          join public.clients c on c.id = e.client_id
          where
            e.id = establishment_id
            and c.owner_user_id = (select auth.uid())
        )
      )
      or (
        target_type = 'patient'
        and exists (
          select 1
          from public.patients p
          join public.clients c on c.id = p.client_id
          where
            p.id = patient_id
            and c.owner_user_id = (select auth.uid())
        )
      )
    )
  );

create policy "scheduled_visits_update_own"
  on public.scheduled_visits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "scheduled_visits_delete_own"
  on public.scheduled_visits for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.scheduled_visits to authenticated;

create or replace function public.scheduled_visits_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scheduled_visits_set_updated_at on public.scheduled_visits;

create trigger scheduled_visits_set_updated_at
before update on public.scheduled_visits
for each row
execute function public.scheduled_visits_touch_updated_at ();
