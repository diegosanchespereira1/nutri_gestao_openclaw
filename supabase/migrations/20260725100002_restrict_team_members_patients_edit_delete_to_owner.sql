-- Restringe edição/remoção de membros da equipa e pacientes apenas ao titular do workspace.
-- Membros da equipa podem ler mas não podem editar dados de outros membros nem de pacientes.

-- ── team_members: remover policy que permite a qualquer membro editar ────────

DROP POLICY IF EXISTS "team_members_update_workspace_team" ON "public"."team_members";

-- ── team_members: delete — remover permissão do cargo 'gestao' ──────────────
-- Apenas o titular do workspace e admins de plataforma podem remover membros.

DROP POLICY IF EXISTS "team_members_delete_workspace_managers" ON "public"."team_members";

CREATE POLICY "team_members_delete_workspace_managers" ON "public"."team_members"
  FOR DELETE TO "authenticated"
  USING (
    ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (
      ( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"())
      OR EXISTS (
        SELECT 1 FROM "public"."profiles" "pr"
        WHERE "pr"."user_id" = ( SELECT "auth"."uid"())
          AND "pr"."role" = ANY (ARRAY['admin', 'super_admin'])
      )
    )
  );

-- ── patients: UPDATE e DELETE só pelo titular ────────────────────────────────

DROP POLICY IF EXISTS "patients_update_own" ON "public"."patients";
DROP POLICY IF EXISTS "patients_delete_own" ON "public"."patients";

CREATE POLICY "patients_update_own" ON "public"."patients"
  FOR UPDATE TO "authenticated"
  USING (
    ("user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  )
  WITH CHECK (
    ("user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );

CREATE POLICY "patients_delete_own" ON "public"."patients"
  FOR DELETE TO "authenticated"
  USING (
    ("user_id" = ( SELECT "public"."workspace_account_owner_id"()))
    AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"())))
    AND (( SELECT "auth"."uid"()) = ( SELECT "public"."workspace_account_owner_id"()))
  );
