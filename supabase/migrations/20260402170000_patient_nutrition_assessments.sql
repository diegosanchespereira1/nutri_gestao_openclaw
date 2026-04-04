-- Avaliações nutricionais versionadas por timestamp — Story 2.4 / FR9 (append-only).

create table if not exists public.patient_nutrition_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  height_cm numeric(5, 2),
  weight_kg numeric(6, 2),
  waist_cm numeric(5, 2),
  activity_level text,
  diet_notes text,
  clinical_notes text,
  goals text,
  constraint patient_naa_activity_check check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'high')
  ),
  constraint patient_naa_height_check check (
    height_cm is null
    or (height_cm >= 40 and height_cm <= 250)
  ),
  constraint patient_naa_weight_check check (
    weight_kg is null
    or (weight_kg >= 2 and weight_kg <= 400)
  ),
  constraint patient_naa_waist_check check (
    waist_cm is null
    or (waist_cm >= 30 and waist_cm <= 200)
  )
);

create index if not exists patient_naa_patient_recorded_idx on public.patient_nutrition_assessments (patient_id, recorded_at desc);

alter table public.patient_nutrition_assessments enable row level security;

create policy "patient_naa_select_own"
  on public.patient_nutrition_assessments for select
  to authenticated
  using (
    exists (
      select 1
      from public.patients p
      join public.clients c on c.id = p.client_id
      where
        p.id = patient_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "patient_naa_insert_own"
  on public.patient_nutrition_assessments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.patients p
      join public.clients c on c.id = p.client_id
      where
        p.id = patient_id
        and c.owner_user_id = (select auth.uid())
    )
  );

grant select, insert on public.patient_nutrition_assessments to authenticated;
