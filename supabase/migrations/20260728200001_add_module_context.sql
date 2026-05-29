-- ============================================================
-- Migration: Módulos funcionais — module_context + enabled_modules
-- ============================================================
-- Adiciona infraestrutura para separação entre:
--   • Atendimento Nutricional (pacientes, avaliações, clínicas)
--   • Assessoria em Serviços de Alimentação (restaurantes, food service)
--
-- Retrocompatibilidade garantida:
--   • DEFAULT '{"atendimento_nutricional":true,"assessoria_alimentacao":true}'
--     mantém todos os tenants existentes com acesso total.
--   • Valores de module_context derivados dos tipos de estabelecimento
--     já cadastrados — nenhum dado é perdido.
-- ============================================================

-- 1. Tipo ENUM para module_context
--    Usar ENUM garante que a coluna só aceita valores da whitelist
--    — SQL injection via UPDATE é impossível.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'module_context'
  ) THEN
    CREATE TYPE module_context AS ENUM (
      'atendimento_nutricional',
      'assessoria_alimentacao'
    );
  END IF;
END$$;

-- ============================================================
-- 2. Módulos habilitados por tenant (profiles)
-- ============================================================

ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "enabled_modules" JSONB NOT NULL
  DEFAULT '{"atendimento_nutricional": true, "assessoria_alimentacao": true}'::jsonb;

-- Index GIN para queries futuras de filtragem por módulo habilitado
CREATE INDEX IF NOT EXISTS idx_profiles_enabled_modules
  ON "public"."profiles" USING gin("enabled_modules");

-- ============================================================
-- 3. checklist_templates (templates globais do sistema)
--    Derivar de applies_to: tipos de AN → atendimento_nutricional
--    Todos os outros (restaurante, frigorifico, etc.) → assessoria_alimentacao
-- ============================================================

ALTER TABLE "public"."checklist_templates"
  ADD COLUMN IF NOT EXISTS "module_context" module_context NOT NULL
  DEFAULT 'assessoria_alimentacao';

-- Templates com tipos de Atendimento Nutricional em applies_to
UPDATE "public"."checklist_templates"
SET "module_context" = 'atendimento_nutricional'
WHERE "applies_to" && ARRAY['clinica', 'escola', 'hospital', 'lar_idosos']::text[]
  AND "module_context" = 'assessoria_alimentacao';

-- ============================================================
-- 4. checklist_workspace_templates (templates customizados da equipe)
--    Default assessoria — templates existentes são de food safety (ANVISA)
-- ============================================================

ALTER TABLE "public"."checklist_workspace_templates"
  ADD COLUMN IF NOT EXISTS "module_context" module_context NOT NULL
  DEFAULT 'assessoria_alimentacao';

-- ============================================================
-- 5. pop_templates (templates globais de POP)
--    Derivar de establishment_type
-- ============================================================

ALTER TABLE "public"."pop_templates"
  ADD COLUMN IF NOT EXISTS "module_context" module_context NOT NULL
  DEFAULT 'assessoria_alimentacao';

UPDATE "public"."pop_templates"
SET "module_context" = 'atendimento_nutricional'
WHERE "establishment_type" IN ('clinica', 'escola', 'hospital', 'lar_idosos')
  AND "module_context" = 'assessoria_alimentacao';

-- ============================================================
-- 6. establishment_pops (instâncias de POP por estabelecimento)
--    Derivar do tipo do estabelecimento pai
-- ============================================================

ALTER TABLE "public"."establishment_pops"
  ADD COLUMN IF NOT EXISTS "module_context" module_context NOT NULL
  DEFAULT 'assessoria_alimentacao';

UPDATE "public"."establishment_pops" ep
SET "module_context" = 'atendimento_nutricional'
FROM "public"."establishments" e
WHERE ep."establishment_id" = e."id"
  AND e."establishment_type" IN ('clinica', 'escola', 'hospital', 'lar_idosos')
  AND ep."module_context" = 'assessoria_alimentacao';

-- ============================================================
-- 7. technical_recipes (fichas técnicas)
--    Food service por natureza → assessoria_alimentacao (default já cobre)
-- ============================================================

ALTER TABLE "public"."technical_recipes"
  ADD COLUMN IF NOT EXISTS "module_context" module_context NOT NULL
  DEFAULT 'assessoria_alimentacao';
