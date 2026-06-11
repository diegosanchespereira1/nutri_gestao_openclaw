-- Checklist quente (PostgREST): menos contenção na sessão + RPC de alertas mais barata.
--
-- 1) checklist_fill_touch_session_from_response: throttle 5s em updated_at da sessão
--    (menos UPDATE na mesma linha) + FOR UPDATE SKIP LOCKED para não bloquear autosaves.
-- 2) get_checklist_validity_alerts: join a partir de clients.owner_user_id em vez de
--    varrer checklist_fill_item_responses por valid_until em todo o público.
-- 3) Índice (session_id, valid_until) para nested loop sessão → respostas no intervalo.

CREATE INDEX IF NOT EXISTS checklist_fill_item_responses_session_valid_until_idx
  ON public.checklist_fill_item_responses (session_id, valid_until)
  WHERE valid_until IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.checklist_fill_touch_session_from_response ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF tg_op = 'DELETE' THEN
    sid := OLD.session_id;
  ELSE
    sid := NEW.session_id;
  END IF;

  -- Só actualiza updated_at da sessão se a última actualização foi há mais de 5s.
  -- SKIP LOCKED: se outra transacção mantém lock na sessão, não bloqueia esta resposta.
  UPDATE public.checklist_fill_sessions s
  SET updated_at = now()
  FROM (
    SELECT ss.id
    FROM public.checklist_fill_sessions ss
    WHERE ss.id = sid
      AND (
        ss.updated_at IS NULL
        OR ss.updated_at < now() - interval '5 seconds'
      )
    FOR UPDATE SKIP LOCKED
  ) locked
  WHERE s.id = locked.id;

  IF tg_op = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
