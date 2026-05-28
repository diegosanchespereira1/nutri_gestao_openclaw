-- Restringe UPDATE e DELETE de clients/establishments apenas ao titular do workspace.
-- Membros da equipa (team_members) podem ler mas não podem editar nem apagar.
-- Condição: auth.uid() = workspace_account_owner_id() é verdadeira só para o titular
-- (para membros da equipa, workspace_account_owner_id() devolve o owner_user_id, ≠ auth.uid()).

-- ── clients ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clients_update_own" ON "public"."clients";
DROP POLICY IF EXISTS "clients_delete_own" ON "public"."clients";

CREATE POLICY "clients_update_own" ON "public"."clients"
  FOR UPDATE TO "authenticated"
  USING (
    ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  )
  WITH CHECK (
    ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );

CREATE POLICY "clients_delete_own" ON "public"."clients"
  FOR DELETE TO "authenticated"
  USING (
    ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );

-- ── establishments ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "establishments_update_own" ON "public"."establishments";
DROP POLICY IF EXISTS "establishments_delete_own" ON "public"."establishments";

CREATE POLICY "establishments_update_own" ON "public"."establishments"
  FOR UPDATE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."clients" "c"
      WHERE "c"."id" = "establishments"."client_id"
        AND "c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."clients" "c"
      WHERE "c"."id" = "establishments"."client_id"
        AND "c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"())
        AND "c"."kind" = 'pj'
    )
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );

CREATE POLICY "establishments_delete_own" ON "public"."establishments"
  FOR DELETE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."clients" "c"
      WHERE "c"."id" = "establishments"."client_id"
        AND "c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"())
    )
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );
