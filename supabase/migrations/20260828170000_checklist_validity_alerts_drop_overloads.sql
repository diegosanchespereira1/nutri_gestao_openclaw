-- Remove overloads antigas da RPC (PostgREST pode resolver a assinatura errada)
-- e força reload do schema cache no API self-hosted.

DROP FUNCTION IF EXISTS public.get_checklist_validity_alerts(uuid, date, date, int, uuid);
DROP FUNCTION IF EXISTS public.get_checklist_validity_alerts(uuid, date, date, int, uuid, date);

CREATE OR REPLACE FUNCTION public.get_checklist_validity_alerts(
  p_owner_user_id uuid,
  p_horizon date,
  p_past_cap date,
  p_limit int DEFAULT 48,
  p_client_id uuid DEFAULT NULL,
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
    FROM public.clients c
    INNER JOIN public.establishments e ON e.client_id = c.id
    INNER JOIN public.checklist_fill_sessions s ON s.establishment_id = e.id
    INNER JOIN public.checklist_fill_item_responses r
      ON r.session_id = s.id
      AND r.valid_until IS NOT NULL
      AND r.valid_until::date >= p_past_cap
      AND r.valid_until::date <= p_horizon
    LEFT JOIN public.checklist_templates ct ON ct.id = s.template_id
    LEFT JOIN public.checklist_custom_templates ctt ON ctt.id = s.custom_template_id
    WHERE c.owner_user_id = p_owner_user_id
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
    SELECT
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until
    FROM ranked
    WHERE bucket = 0
    ORDER BY valid_until ASC
    LIMIT GREATEST(1, (p_limit + 1) / 2)
  ),
  proximos AS (
    SELECT
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until
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
$$;

GRANT EXECUTE ON FUNCTION public.get_checklist_validity_alerts(uuid, date, date, int, uuid, date)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
