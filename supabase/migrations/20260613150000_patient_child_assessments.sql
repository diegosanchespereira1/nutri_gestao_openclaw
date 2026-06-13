-- Migration: patient_child_assessments
-- Avaliação nutricional infantil (0–19 anos) — curvas OMS 2006/2007 / SISVAN.
-- Classificação por percentil usando apenas as colunas tabeladas dos documentos
-- (ver lib/nutrition/child). Critério escore-Z fica pronto para o futuro.

create table patient_child_assessments (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references patients(id) on delete cascade,
  recorded_at timestamptz not null default now(),

  -- Contexto etário congelado no momento da avaliação (rastreabilidade)
  sex         text    not null check (sex in ('female','male')),
  age_months  integer not null check (age_months >= 0 and age_months <= 240),

  -- Medidas aferidas
  weight_kg   numeric(6,3) check (weight_kg > 0),
  height_cm   numeric(5,2) check (height_cm > 0),
  measured_lying boolean,                 -- comprimento (deitado) x estatura (em pé)

  -- Critério escolhido (exclusivo). Default percentile = único conjunto carregado hoje.
  classification_method text not null default 'percentile'
    check (classification_method in ('percentile','zscore')),

  -- IMC calculado (kg/m²) — congelado
  bmi numeric(5,2),

  -- Resultados congelados por indicador (percentil + classificação + cor),
  -- exatamente como exibidos ao profissional.
  -- shape: [{ "indicator":"bmi_for_age","percentile":52.3,"z":null,
  --           "classification":"Eutrofia","color":"green","boundary":null,"outOfRange":false }, ...]
  results jsonb not null default '[]'::jsonb,

  clinical_notes text,
  created_at timestamptz not null default now()
);

comment on table patient_child_assessments is
  'Avaliação nutricional infantil 0–19 anos. Referência: curvas OMS 2006/2007 (edição percentis) / SISVAN.';
comment on column patient_child_assessments.results is
  'Resultados por indicador congelados (percentil/classificação/cor) no momento do registo.';

-- ── Row Level Security (paciente do workspace; suporta paciente independente) ──
alter table patient_child_assessments enable row level security;

create policy "patient_child_select_own" on patient_child_assessments
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_child_assessments.patient_id
        and p.user_id = (select workspace_account_owner_id())
    )
  );

create policy "patient_child_insert_own" on patient_child_assessments
  for insert to authenticated
  with check (
    exists (
      select 1 from patients p
      where p.id = patient_child_assessments.patient_id
        and p.user_id = (select workspace_account_owner_id())
    )
  );

create policy "patient_child_update_own" on patient_child_assessments
  for update to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_child_assessments.patient_id
        and p.user_id = (select workspace_account_owner_id())
    )
  );

create policy "patient_child_delete_own" on patient_child_assessments
  for delete to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_child_assessments.patient_id
        and p.user_id = (select workspace_account_owner_id())
    )
  );

-- ── Permissões de tabela (RLS controla as linhas; GRANT controla a tabela) ────
grant select, insert, update, delete on patient_child_assessments to authenticated;

-- ── Índice ────────────────────────────────────────────────────────────────────
create index patient_child_assessments_patient_id_idx
  on patient_child_assessments (patient_id, recorded_at desc);
