-- Adiciona "hotel" como tipo de estabelecimento (Assessoria em Serviços de Alimentação).

ALTER TABLE "public"."establishments"
  DROP CONSTRAINT "establishments_type_check";

ALTER TABLE "public"."establishments"
  ADD CONSTRAINT "establishments_type_check"
  CHECK ("establishment_type" = ANY (ARRAY[
    'escola'::text,
    'hospital'::text,
    'clinica'::text,
    'lar_idosos'::text,
    'restaurante'::text,
    'frigorifico'::text,
    'mercado'::text,
    'cozinha_industrial'::text,
    'hotel'::text,
    'empresa'::text
  ]));

ALTER TABLE "public"."pop_templates"
  DROP CONSTRAINT "pop_templates_type_check";

ALTER TABLE "public"."pop_templates"
  ADD CONSTRAINT "pop_templates_type_check"
  CHECK ("establishment_type" = ANY (ARRAY[
    'escola'::text,
    'hospital'::text,
    'clinica'::text,
    'lar_idosos'::text,
    'restaurante'::text,
    'frigorifico'::text,
    'mercado'::text,
    'cozinha_industrial'::text,
    'hotel'::text,
    'empresa'::text
  ]));
