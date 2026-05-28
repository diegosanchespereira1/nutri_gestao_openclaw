-- Corrige as RLS policies das 3 tabelas de avaliação nutricional para suportar
-- pacientes sem cliente (client_id IS NULL), verificando user_id directamente
-- no registo do paciente em vez de fazer JOIN através da tabela clients.

-- ── patient_nutrition_assessments ────────────────────────────────────────────

DROP POLICY IF EXISTS "patient_naa_insert_own" ON "public"."patient_nutrition_assessments";
DROP POLICY IF EXISTS "patient_naa_select_own" ON "public"."patient_nutrition_assessments";

CREATE POLICY "patient_naa_insert_own" ON "public"."patient_nutrition_assessments"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."patients" "p"
      WHERE "p"."id" = "patient_nutrition_assessments"."patient_id"
        AND "p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
  );

CREATE POLICY "patient_naa_select_own" ON "public"."patient_nutrition_assessments"
  FOR SELECT TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."patients" "p"
      WHERE "p"."id" = "patient_nutrition_assessments"."patient_id"
        AND "p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
  );

-- ── patient_adult_nutrition_assessments ──────────────────────────────────────

DROP POLICY IF EXISTS "owner via patient chain adult nutrition" ON "public"."patient_adult_nutrition_assessments";

CREATE POLICY "owner via patient chain adult nutrition" ON "public"."patient_adult_nutrition_assessments"
  USING (
    "patient_id" IN (
      SELECT "p"."id" FROM "public"."patients" "p"
      WHERE "p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
  );

-- ── patient_geriatric_assessments ────────────────────────────────────────────

DROP POLICY IF EXISTS "owner via patient chain" ON "public"."patient_geriatric_assessments";

CREATE POLICY "owner via patient chain" ON "public"."patient_geriatric_assessments"
  USING (
    "patient_id" IN (
      SELECT "p"."id" FROM "public"."patients" "p"
      WHERE "p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
  );
