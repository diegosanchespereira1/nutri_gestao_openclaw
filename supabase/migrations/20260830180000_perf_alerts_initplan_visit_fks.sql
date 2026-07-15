-- Performance: reescreve alertas de validade (partir de responses indexadas),
-- InitPlan em policies avisadas pelo advisor, FKs de visitas sem índice.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Índices FK em scheduled_visits
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS scheduled_visits_patient_id_idx
  ON public.scheduled_visits (patient_id)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS scheduled_visits_establishment_id_idx
  ON public.scheduled_visits (establishment_id)
  WHERE establishment_id IS NOT NULL;

-- Índice parcial para o caminho "responses por validade" (alertas / herança)
CREATE INDEX IF NOT EXISTS checklist_fill_item_responses_valid_until_range_idx
  ON public.checklist_fill_item_responses (valid_until)
  WHERE valid_until IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) InitPlan: account_closure_requests + establishment_areas (LGPD helper)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "account_closure_requests_admin_select"
  ON public.account_closure_requests;

CREATE POLICY "account_closure_requests_admin_select"
  ON public.account_closure_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "establishment_areas_select_own" ON public.establishment_areas;
DROP POLICY IF EXISTS "establishment_areas_insert_own" ON public.establishment_areas;
DROP POLICY IF EXISTS "establishment_areas_update_own" ON public.establishment_areas;
DROP POLICY IF EXISTS "establishment_areas_delete_own" ON public.establishment_areas;

CREATE POLICY "establishment_areas_select_own"
  ON public.establishment_areas
  FOR SELECT
  TO authenticated
  USING (
    NOT (SELECT public.profile_lgpd_is_actively_blocked((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1
      FROM public.establishments e
      JOIN public.clients c ON c.id = e.client_id
      WHERE e.id = establishment_areas.establishment_id
        AND c.owner_user_id = (SELECT public.workspace_account_owner_id())
    )
  );

CREATE POLICY "establishment_areas_insert_own"
  ON public.establishment_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT (SELECT public.profile_lgpd_is_actively_blocked((SELECT auth.uid())))
    AND owner_user_id = (SELECT public.workspace_account_owner_id())
    AND EXISTS (
      SELECT 1
      FROM public.establishments e
      JOIN public.clients c ON c.id = e.client_id
      WHERE e.id = establishment_areas.establishment_id
        AND c.owner_user_id = (SELECT public.workspace_account_owner_id())
        AND c.kind = 'pj'
    )
  );

CREATE POLICY "establishment_areas_update_own"
  ON public.establishment_areas
  FOR UPDATE
  TO authenticated
  USING (
    NOT (SELECT public.profile_lgpd_is_actively_blocked((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1
      FROM public.establishments e
      JOIN public.clients c ON c.id = e.client_id
      WHERE e.id = establishment_areas.establishment_id
        AND c.owner_user_id = (SELECT public.workspace_account_owner_id())
    )
  )
  WITH CHECK (
    NOT (SELECT public.profile_lgpd_is_actively_blocked((SELECT auth.uid())))
    AND owner_user_id = (SELECT public.workspace_account_owner_id())
    AND EXISTS (
      SELECT 1
      FROM public.establishments e
      JOIN public.clients c ON c.id = e.client_id
      WHERE e.id = establishment_areas.establishment_id
        AND c.owner_user_id = (SELECT public.workspace_account_owner_id())
        AND c.kind = 'pj'
    )
  );

CREATE POLICY "establishment_areas_delete_own"
  ON public.establishment_areas
  FOR DELETE
  TO authenticated
  USING (
    NOT (SELECT public.profile_lgpd_is_actively_blocked((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1
      FROM public.establishments e
      JOIN public.clients c ON c.id = e.client_id
      WHERE e.id = establishment_areas.establishment_id
        AND c.owner_user_id = (SELECT public.workspace_account_owner_id())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) get_checklist_validity_alerts — filtrar por valid_until primeiro
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_checklist_validity_alerts(
  p_owner_user_id uuid,
  p_horizon date,
  p_past_cap date,
  p_limit integer DEFAULT 48,
  p_client_id uuid DEFAULT NULL::uuid,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  response_id uuid,
  session_id uuid,
  client_id uuid,
  client_name text,
  checklist_name text,
  valid_until date
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH owned_establishments AS (
    SELECT
      e.id AS establishment_id,
      c.id AS client_id,
      COALESCE(NULLIF(TRIM(c.trade_name), ''), c.legal_name) AS client_name
    FROM public.clients c
    INNER JOIN public.establishments e ON e.client_id = c.id
    WHERE c.owner_user_id = p_owner_user_id
      AND (p_client_id IS NULL OR c.id = p_client_id)
  ),
  candidates AS (
    SELECT
      r.id AS response_id,
      s.id AS session_id,
      oe.client_id,
      oe.client_name,
      COALESCE(ct.name, ctt.name, 'Checklist') AS checklist_name,
      r.valid_until,
      CONCAT(
        oe.client_id::text, '|', s.establishment_id::text, '|',
        CASE
          WHEN s.template_id IS NOT NULL THEN 'template:' || s.template_id::text
          WHEN s.custom_template_id IS NOT NULL THEN 'custom:' || s.custom_template_id::text
          ELSE 'session:' || s.id::text
        END
      ) AS scope_key
    FROM public.checklist_fill_item_responses r
    INNER JOIN public.checklist_fill_sessions s
      ON s.id = r.session_id
     AND s.dossier_approved_at IS NOT NULL
    INNER JOIN owned_establishments oe
      ON oe.establishment_id = s.establishment_id
    LEFT JOIN public.checklist_templates ct ON ct.id = s.template_id
    LEFT JOIN public.checklist_custom_templates ctt ON ctt.id = s.custom_template_id
    WHERE r.valid_until IS NOT NULL
      AND r.valid_until >= p_past_cap
      AND r.valid_until <= p_horizon
  ),
  latest AS (
    SELECT DISTINCT ON (scope_key)
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until
    FROM candidates
    ORDER BY scope_key, valid_until DESC
  ),
  ranked AS (
    SELECT
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until,
      CASE WHEN valid_until < p_today THEN 0 ELSE 1 END AS bucket
    FROM latest
  ),
  vencidos AS (
    SELECT response_id, session_id, client_id, client_name, checklist_name, valid_until
    FROM ranked
    WHERE bucket = 0
    ORDER BY valid_until ASC
    LIMIT GREATEST(1, (p_limit + 1) / 2)
  ),
  proximos AS (
    SELECT response_id, session_id, client_id, client_name, checklist_name, valid_until
    FROM ranked
    WHERE bucket = 1
    ORDER BY valid_until ASC
    LIMIT GREATEST(1, p_limit / 2)
  ),
  combined AS (
    SELECT * FROM vencidos
    UNION ALL
    SELECT * FROM proximos
  )
  SELECT
    response_id,
    session_id,
    client_id,
    client_name,
    checklist_name,
    valid_until
  FROM combined
  ORDER BY
    CASE WHEN valid_until < p_today THEN 0 ELSE 1 END,
    valid_until ASC
  LIMIT GREATEST(1, p_limit);
$function$;

GRANT EXECUTE ON FUNCTION public.get_checklist_validity_alerts(uuid, date, date, int, uuid, date)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
