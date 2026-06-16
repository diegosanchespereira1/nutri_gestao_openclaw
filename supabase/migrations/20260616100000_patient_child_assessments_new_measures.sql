-- Story: Novos parâmetros antropométricos na avaliação infantil
-- Adiciona medidas WHO Child Growth Standards para faixa 0–60 meses.
-- Colunas nullable: campos opcionais por avaliação.
-- Não executar via migration automática — aplicar manualmente via Supabase Studio.

alter table patient_child_assessments
  add column if not exists arm_circumference_cm    numeric(5,2) check (arm_circumference_cm    > 0),
  add column if not exists triceps_skinfold_mm     numeric(5,2) check (triceps_skinfold_mm     > 0),
  add column if not exists subscapular_skinfold_mm numeric(5,2) check (subscapular_skinfold_mm > 0),
  add column if not exists head_circumference_cm   numeric(5,2) check (head_circumference_cm   > 0);

comment on column patient_child_assessments.arm_circumference_cm
  is 'Circunferência do braço (cm). Tabela WHO CB: faixa 3–60 meses.';

comment on column patient_child_assessments.triceps_skinfold_mm
  is 'Prega cutânea tricipital (mm). Tabela WHO PCT: faixa 3–60 meses.';

comment on column patient_child_assessments.subscapular_skinfold_mm
  is 'Prega subescapular (mm). Tabela WHO SE: faixa 3–60 meses.';

comment on column patient_child_assessments.head_circumference_cm
  is 'Perímetro cefálico (cm). Tabela WHO PC: faixa 0–60 meses.';
