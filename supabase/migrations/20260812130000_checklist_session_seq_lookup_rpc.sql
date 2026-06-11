-- Numeração sequencial de sessões por cliente (created_at) sem transferir todos os IDs para o Node.
-- Usado por loadChecklistSessionsForClient (tab Checklists na edição do cliente).

CREATE INDEX IF NOT EXISTS checklist_fill_sessions_est_created_id_idx
  ON public.checklist_fill_sessions (establishment_id, created_at, id);

CREATE OR REPLACE FUNCTION public.checklist_fill_sessions_seq_lookup(
  p_establishment_ids uuid[],
  p_session_ids uuid[]
)
RETURNS TABLE(session_id uuid, seq_number integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ranked.id AS session_id, ranked.seq_number::integer
  FROM (
    SELECT
      cfs.id,
      row_number() OVER (
        ORDER BY cfs.created_at ASC, cfs.id ASC
      )::integer AS seq_number
    FROM public.checklist_fill_sessions cfs
    WHERE cfs.establishment_id = ANY(p_establishment_ids)
  ) AS ranked
  WHERE ranked.id = ANY(p_session_ids);
$$;

COMMENT ON FUNCTION public.checklist_fill_sessions_seq_lookup(uuid[], uuid[]) IS
  'Devolve row_number (1-based por created_at) só para os session_ids pedidos; evita SELECT de todos os ids.';

GRANT EXECUTE ON FUNCTION public.checklist_fill_sessions_seq_lookup(uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checklist_fill_sessions_seq_lookup(uuid[], uuid[]) TO service_role;
