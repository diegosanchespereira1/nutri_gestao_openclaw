-- Fix: get_checklist_validity_alerts deve ser tenant-first.
--
-- CONTEXTO / HISTORICO DE REGRESSAO
--   20260805150000_perf_navigation_queries.sql
--     Versao original: varria checklist_fill_item_responses por valid_until
--     (global, sem escopo de tenant) antes de filtrar por owner.
--   20260810140000_perf_checklist_hot_queries.sql
--     CORRIGIU: passou a partir de clients.owner_user_id, criando o indice
--     composto (session_id, valid_until).
--   20260830170000_stabilize_checklist_save_and_alerts.sql
--     Manteve o padrao correto (owned_establishments -> approved_sessions).
--   20260830180000_perf_alerts_initplan_visit_fks.sql
--     REGREDIU (~5h depois): voltou a partir de checklist_fill_item_responses
--     e recriou um indice global (valid_until), reintroduzindo o anti-padrao.
--
-- IMPACTO OBSERVADO (projeto Nutricao_Stratostech, compute Micro/1GB):
--   latencia media da RPC ~1100ms; o range scan global sobre a tabela inteira
--   (janela de ~455 dias, todos os tenants) saturava o shared buffer da
--   instancia e degradava TODAS as demais queries por evicao de cache.
--
-- ESTA MIGRATION apenas VERSIONA o estado que ja foi aplicado manualmente em
-- producao em 30/07/2026 (via SQL editor, fora do controle de migrations).
-- Em producao e no-op; serve para alinhar DEV e qualquer ambiente novo criado
-- a partir das migrations, que hoje ainda nascem com a versao lenta.
--
-- APOS CORRECAO: latencia media 14,2ms (medido em 118 chamadas reais).

-- 1) Remove o indice global duplicado criado por 20260830180000.
--    E funcionalmente identico a checklist_fill_item_responses_valid_until_idx
--    (mesma coluna, mesmo predicado parcial), so onera INSERT/UPDATE.
DROP INDEX IF EXISTS public.checklist_fill_item_responses_valid_until_range_idx;

-- 2) Redefine a funcao com join tenant-first:
--    owned_establishments -> approved_sessions -> candidates (LATERAL por session_id),
--    usando checklist_fill_item_responses_session_valid_until_idx (session_id, valid_until).
--    As CTEs sao MATERIALIZED para impedir que o planner faca inline e volte
--    a escolher o scan global por data.

CREATE OR REPLACE FUNCTION public.get_checklist_validity_alerts(p_owner_user_id uuid, p_horizon date, p_past_cap date, p_limit integer DEFAULT 48, p_client_id uuid DEFAULT NULL::uuid, p_today date DEFAULT CURRENT_DATE)
 RETURNS TABLE(response_id uuid, session_id uuid, client_id uuid, client_name text, checklist_name text, valid_until date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH owned_establishments AS MATERIALIZED (
    SELECT
      e.id AS establishment_id,
      c.id AS client_id,
      COALESCE(NULLIF(TRIM(c.trade_name), ''), c.legal_name) AS client_name
    FROM public.clients c
    INNER JOIN public.establishments e ON e.client_id = c.id
    WHERE c.owner_user_id = p_owner_user_id
      AND (p_client_id IS NULL OR c.id = p_client_id)
  ),
  approved_sessions AS MATERIALIZED (
    SELECT
      s.id AS session_id,
      s.establishment_id,
      s.template_id,
      s.custom_template_id,
      oe.client_id,
      oe.client_name
    FROM owned_establishments oe
    INNER JOIN public.checklist_fill_sessions s
      ON s.establishment_id = oe.establishment_id
     AND s.dossier_approved_at IS NOT NULL
  ),
  candidates AS (
    SELECT
      r.response_id,
      ash.session_id,
      ash.client_id,
      ash.client_name,
      COALESCE(ct.name, ctt.name, 'Checklist') AS checklist_name,
      r.valid_until,
      CONCAT(
        ash.client_id::text, '|', ash.establishment_id::text, '|',
        CASE
          WHEN ash.template_id IS NOT NULL THEN 'template:' || ash.template_id::text
          WHEN ash.custom_template_id IS NOT NULL THEN 'custom:' || ash.custom_template_id::text
          ELSE 'session:' || ash.session_id::text
        END
      ) AS scope_key
    FROM approved_sessions ash
    INNER JOIN LATERAL (
      SELECT
        resp.id AS response_id,
        resp.valid_until
      FROM public.checklist_fill_item_responses resp
      WHERE resp.session_id = ash.session_id
        AND resp.valid_until IS NOT NULL
        AND resp.valid_until >= p_past_cap
        AND resp.valid_until <= p_horizon
      OFFSET 0
    ) r ON true
    LEFT JOIN public.checklist_templates ct ON ct.id = ash.template_id
    LEFT JOIN public.checklist_custom_templates ctt ON ctt.id = ash.custom_template_id
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
