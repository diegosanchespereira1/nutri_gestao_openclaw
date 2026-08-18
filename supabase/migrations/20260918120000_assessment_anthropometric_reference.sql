-- Referência antropométrica (Frisancho 1999 · NHANES III) escolhida pelo
-- profissional em cada avaliação. Nullable: avaliações já existentes continuam
-- válidas; o cálculo usa fallback por tipo (adulto → Frisancho, idoso → NHANES).

alter table public.patient_adult_nutrition_assessments
  add column if not exists anthropometric_reference text
    check (anthropometric_reference in ('frisancho', 'nhanes'));

alter table public.patient_geriatric_assessments
  add column if not exists anthropometric_reference text
    check (anthropometric_reference in ('frisancho', 'nhanes'));

comment on column public.patient_adult_nutrition_assessments.anthropometric_reference is
  'Método de percentil CB/DCT/CMB escolhido nesta avaliação: frisancho (1999) ou nhanes (NHANES III).';

comment on column public.patient_geriatric_assessments.anthropometric_reference is
  'Método de percentil CB/DCT/CMB escolhido nesta avaliação: frisancho (1999) ou nhanes (NHANES III).';
