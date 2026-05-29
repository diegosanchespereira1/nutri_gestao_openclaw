-- Membros da equipa devem poder cadastrar clientes no workspace.
-- UPDATE/DELETE permanecem restritos ao titular (20260725100001).

DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;

CREATE POLICY "clients_insert_own" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT public.workspace_account_owner_id())
    AND (SELECT auth.uid()) IN (SELECT public.workspace_member_user_ids())
    AND NOT public.profile_lgpd_is_actively_blocked((SELECT auth.uid()))
  );

COMMENT ON POLICY "clients_insert_own" ON public.clients IS
  'Titular e membros da equipa podem criar clientes no workspace.';
