-- Categorias do sistema (built_in_key) só podem ser alteradas por
-- admin / super_admin da plataforma. Categorias personalizadas continuam
-- no workspace.

DROP POLICY IF EXISTS "client_custom_segments_workspace" ON public.client_custom_segments;

CREATE POLICY "client_custom_segments_select"
  ON public.client_custom_segments
  FOR SELECT
  TO authenticated
  USING (owner_user_id = (SELECT public.workspace_account_owner_id()));

CREATE POLICY "client_custom_segments_insert"
  ON public.client_custom_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT public.workspace_account_owner_id())
    AND (
      built_in_key IS NULL
      OR (SELECT public.is_admin_user())
    )
  );

CREATE POLICY "client_custom_segments_update"
  ON public.client_custom_segments
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = (SELECT public.workspace_account_owner_id())
    AND (
      built_in_key IS NULL
      OR (SELECT public.is_admin_user())
    )
  )
  WITH CHECK (
    owner_user_id = (SELECT public.workspace_account_owner_id())
    AND (
      built_in_key IS NULL
      OR (SELECT public.is_admin_user())
    )
  );

CREATE POLICY "client_custom_segments_delete"
  ON public.client_custom_segments
  FOR DELETE
  TO authenticated
  USING (
    owner_user_id = (SELECT public.workspace_account_owner_id())
    AND (
      built_in_key IS NULL
      OR (SELECT public.is_admin_user())
    )
  );
