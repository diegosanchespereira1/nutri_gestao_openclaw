-- Migration: patient_geriatric_assessments
-- Avaliação nutricional especializada para idosos (Chumlea et al.)
-- Campos baseados na planilha de referência (Mês 2023)

create table patient_geriatric_assessments (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references patients(id) on delete cascade,
  recorded_at   timestamptz not null default now(),

  -- ── Perfil do paciente ─────────────────────────────────────────────────
  -- Define qual fórmula de Peso Estimado e Altura serão aplicadas
  patient_group text not null check (
    patient_group in ('mulher_branca','mulher_negra','homem_branco','homem_negro')
  ),
  has_amputation        boolean      not null default false,
  amputation_segment_pct numeric(5,2)         -- % do segmento amputado (ex: 5.9 para perna+pé)
    check (amputation_segment_pct > 0 and amputation_segment_pct < 100),
  age_years     integer check (age_years >= 0 and age_years <= 130),

  -- ── Medidas antropométricas (entrada manual) ───────────────────────────
  cb_cm            numeric(5,2) check (cb_cm >= 0),       -- Circunferência do Braço
  dct_mm           numeric(5,2) check (dct_mm >= 0),      -- Dobra Cutânea Tricipital
  cp_cm            numeric(5,2) check (cp_cm >= 0),       -- Circunferência da Panturrilha
  aj_cm            numeric(5,2) check (aj_cm >= 0),       -- Altura do Joelho
  weight_real_kg   numeric(6,2) check (weight_real_kg >= 0), -- Peso Real aferido (null se não mensurável)

  -- ── Valores calculados e armazenados (para rastreabilidade histórica) ─
  cmb_cm              numeric(5,2),   -- CMB = CB − (DCT × 0,314)
  estimated_weight_kg numeric(6,2),  -- Peso Estimado via fórmula Chumlea
  estimated_height_m  numeric(4,3),  -- Altura Estimada via fórmula Chumlea
  bmi                 numeric(5,2),  -- IMC = PE / H²

  -- ── Prescrição energético-proteica ────────────────────────────────────
  kcal_per_kg       numeric(5,1) check (kcal_per_kg >= 0),
  energy_needs_kcal numeric(8,1),    -- NE = PE × Kcal/kg (calculado)
  ptn_per_kg        numeric(4,2) check (ptn_per_kg >= 0),
  protein_needs_g   numeric(7,1),    -- NP = PTN/kg × PE (calculado)

  -- ── Avaliação clínica ──────────────────────────────────────────────────
  nutritional_risk      text check (nutritional_risk in ('s_rn','c_rn')),
  nutritional_diagnosis text,        -- ex: "SRD-19", "SRN-12", "D-16"
  clinical_notes        text,

  created_at timestamptz not null default now()
);

comment on table patient_geriatric_assessments is
  'Avaliação nutricional especializada para idosos. Fórmulas: Chumlea et al. (1985/1988), Gurney & Jelliffe (1973).';

comment on column patient_geriatric_assessments.patient_group is
  'Define a equação de Peso Estimado e Altura: mulher_branca (PE=AJ×1.09+CB×2.68-65.51), mulher_negra (PE=AJ×1.5+CB×2.58-84.22), homem_branco (PE=AJ×1.1+CB×3.07-75.81), homem_negro (PE=AJ×0.44+CB×2.86-39.21).';

comment on column patient_geriatric_assessments.amputation_segment_pct is
  'Percentual do segmento amputado (Osterkamp, 1995): coxa=10,0%, perna+pé=5,9%, pé=1,8%, etc.';

comment on column patient_geriatric_assessments.cmb_cm is
  'Calculado: CMB = CB − (DCT × 0,314) — Gurney & Jelliffe, 1973.';

comment on column patient_geriatric_assessments.estimated_weight_kg is
  'Calculado via fórmula Chumlea et al. (1988). Para amputados: PE_base × 100 ÷ (100 − % segmento).';

comment on column patient_geriatric_assessments.estimated_height_m is
  'Calculado via fórmula Chumlea et al. (1985). Mulheres: (84.88+1.83×AJ−0.24×Idade)÷100. Homens: (64.19+2.04×AJ−0.04×Idade)÷100.';

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table patient_geriatric_assessments enable row level security;

create policy "owner via patient chain"
  on patient_geriatric_assessments
  for all
  using (
    patient_id in (
      select p.id
      from patients p
      join clients c on c.id = p.client_id
      where c.owner_user_id = auth.uid()
    )
  );

-- ── Índices ────────────────────────────────────────────────────────────────
create index patient_geriatric_assessments_patient_id_idx
  on patient_geriatric_assessments (patient_id, recorded_at desc);
