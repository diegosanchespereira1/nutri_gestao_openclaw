-- Navegação rápida: alertas de validade em 1 query + índices de agenda.

CREATE OR REPLACE FUNCTION public.get_checklist_validity_alerts(
  p_owner_user_id uuid,
  p_horizon date,
  p_past_cap date,
  p_limit int DEFAULT 8,
  p_client_id uuid DEFAULT NULL
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
SECURITY INVOKER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      r.id AS response_id,
      s.id AS session_id,
      c.id AS client_id,
      COALESCE(NULLIF(TRIM(c.trade_name), ''), c.legal_name) AS client_name,
      COALESCE(ct.name, ctt.name, 'Checklist') AS checklist_name,
      r.valid_until::date AS valid_until,
      CONCAT(
        c.id::text, '|', s.establishment_id::text, '|',
        CASE
          WHEN s.template_id IS NOT NULL THEN 'template:' || s.template_id::text
          WHEN s.custom_template_id IS NOT NULL THEN 'custom:' || s.custom_template_id::text
          ELSE 'session:' || s.id::text
        END
      ) AS scope_key
    FROM public.checklist_fill_item_responses r
    INNER JOIN public.checklist_fill_sessions s ON s.id = r.session_id
    INNER JOIN public.establishments e ON e.id = s.establishment_id
    INNER JOIN public.clients c ON c.id = e.client_id
    LEFT JOIN public.checklist_templates ct ON ct.id = s.template_id
    LEFT JOIN public.checklist_custom_templates ctt ON ctt.id = s.custom_template_id
    WHERE c.owner_user_id = p_owner_user_id
      AND r.valid_until IS NOT NULL
      AND r.valid_until::date >= p_past_cap
      AND r.valid_until::date <= p_horizon
      AND (p_client_id IS NULL OR c.id = p_client_id)
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
  )
  SELECT
    response_id,
    session_id,
    client_id,
    client_name,
    checklist_name,
    valid_until
  FROM latest
  ORDER BY
    CASE WHEN valid_until < CURRENT_DATE THEN 0 ELSE 1 END,
    valid_until ASC
  LIMIT GREATEST(1, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.get_checklist_validity_alerts(uuid, date, date, int, uuid)
  TO authenticated;

CREATE INDEX IF NOT EXISTS scheduled_visits_scheduled_start_idx
  ON public.scheduled_visits (scheduled_start);

CREATE INDEX IF NOT EXISTS scheduled_visits_user_start_idx
  ON public.scheduled_visits (user_id, scheduled_start);

CREATE INDEX IF NOT EXISTS checklist_fill_item_responses_valid_until_idx
  ON public.checklist_fill_item_responses (valid_until)
  WHERE valid_until IS NOT NULL;
