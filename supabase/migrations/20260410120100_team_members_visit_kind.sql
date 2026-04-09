-- Equipe do profissional + tipo de visita + atribuição (FR17 ext.).

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  professional_area text not null default 'nutrition'
    constraint team_members_professional_area_check check (
      professional_area in ('nutrition', 'other')
    ),
  job_role text not null
    constraint team_members_job_role_check check (
      job_role in (
        'nutricionista',
        'nutricionista_estagiario',
        'tecnico_nutricao',
        'auxiliar',
        'administrativo',
        'gestao',
        'outro'
      )
    ),
  crn text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_owner_idx
  on public.team_members (owner_user_id);

alter table public.team_members enable row level security;

drop policy if exists "team_members_select_own" on public.team_members;
drop policy if exists "team_members_insert_own" on public.team_members;
drop policy if exists "team_members_update_own" on public.team_members;
drop policy if exists "team_members_delete_own" on public.team_members;

create policy "team_members_select_own"
  on public.team_members for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "team_members_update_own"
  on public.team_members for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "team_members_delete_own"
  on public.team_members for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

grant select, insert, update, delete on public.team_members to authenticated;

create or replace function public.team_members_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists team_members_set_updated_at on public.team_members;

create trigger team_members_set_updated_at
before update on public.team_members
for each row
execute function public.team_members_touch_updated_at ();

-- Visitas: tipo operacional e profissional atribuído (opcional).
alter table public.scheduled_visits
  add column if not exists visit_kind text;

alter table public.scheduled_visits
  add column if not exists assigned_team_member_id uuid references public.team_members (id) on delete set null;

update public.scheduled_visits
set
  visit_kind = case
    when target_type = 'patient' then 'patient_care'
    else 'technical_compliance'
  end
where visit_kind is null;

alter table public.scheduled_visits
  alter column visit_kind set not null;

alter table public.scheduled_visits
  drop constraint if exists scheduled_visits_visit_kind_check;

alter table public.scheduled_visits
  add constraint scheduled_visits_visit_kind_check check (
    visit_kind in (
      'patient_care',
      'technical_compliance',
      'follow_up',
      'audit',
      'training',
      'other'
    )
  );

create index if not exists scheduled_visits_assigned_member_idx
  on public.scheduled_visits (assigned_team_member_id)
  where assigned_team_member_id is not null;

-- Recriar política de insert com validação do membro da equipe.
drop policy if exists "scheduled_visits_insert_own" on public.scheduled_visits;

create policy "scheduled_visits_insert_own"
  on public.scheduled_visits for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select auth.uid())
      )
    )
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

drop policy if exists "scheduled_visits_update_own" on public.scheduled_visits;

create policy "scheduled_visits_update_own"
  on public.scheduled_visits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select auth.uid())
      )
    )
  );
