-- Avaliação nutricional para adultos (18–60 anos) — fórmulas distintas da avaliação geriátrica.
-- Peso estimado: AJ×1,01 + CB×2,81 − 60,04 (cm → kg).
-- Altura estimada: Chumlea et al. (1985), equações adultas por sexo/etnia (ver lib/nutrition/adult-anthropometry.ts).

create table patient_adult_nutrition_assessments (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references patients(id) on delete cascade,
  recorded_at   timestamptz not null default now(),

  patient_group text not null check (
    patient_group in ('mulher_branca','mulher_negra','homem_branco','homem_negro')
  ),
  has_amputation        boolean      not null default false,
  amputation_segment_pct numeric(5,2)
    check (amputation_segment_pct > 0 and amputation_segment_pct < 100),
  age_years     integer check (age_years >= 0 and age_years <= 130),

  cb_cm            numeric(5,2) check (cb_cm >= 0),
  dct_mm           numeric(5,2) check (dct_mm >= 0),
  cp_cm            numeric(5,2) check (cp_cm >= 0),
  aj_cm            numeric(5,2) check (aj_cm >= 0),
  weight_real_kg   numeric(6,2) check (weight_real_kg >= 0),

  cmb_cm              numeric(5,2),
  estimated_weight_kg numeric(6,2),
  estimated_height_m  numeric(4,3),
  bmi                 numeric(5,2),

  kcal_per_kg       numeric(5,1) check (kcal_per_kg >= 0),
  energy_needs_kcal numeric(8,1),
  ptn_per_kg        numeric(4,2) check (ptn_per_kg >= 0),
  protein_needs_g   numeric(7,1),

  nutritional_risk      text check (nutritional_risk in ('s_rn','c_rn')),
  nutritional_diagnosis text,
  clinical_notes        text,

  created_at timestamptz not null default now()
);

comment on table patient_adult_nutrition_assessments is
  'Avaliação nutricional adultos: peso estimado (AJ/CB); altura estimada Chumlea adulto 18–60; restante alinhado à avaliação geriátrica.';

alter table patient_adult_nutrition_assessments enable row level security;

create policy "owner via patient chain adult nutrition"
  on patient_adult_nutrition_assessments
  for all
  using (
    patient_id in (
      select p.id
      from patients p
      join clients c on c.id = p.client_id
      where c.owner_user_id = auth.uid()
    )
  );

create index patient_adult_nutrition_assessments_patient_id_idx
  on patient_adult_nutrition_assessments (patient_id, recorded_at desc);
