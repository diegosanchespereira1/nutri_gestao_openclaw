-- Performance: notas de checklist na lista de clientes + índice de sessões aprovadas.

CREATE OR REPLACE FUNCTION public.get_latest_checklist_scores_for_clients(
  p_client_ids uuid[]
)
RETURNS TABLE(client_id uuid, score_percentage numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (e.client_id)
    e.client_id,
    s.score_percentage
  FROM public.establishments e
  INNER JOIN public.checklist_fill_sessions s
    ON s.establishment_id = e.id
  WHERE e.client_id = ANY(p_client_ids)
    AND s.dossier_approved_at IS NOT NULL
    AND s.score_percentage IS NOT NULL
  ORDER BY e.client_id, s.dossier_approved_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_checklist_scores_for_clients(uuid[])
  TO authenticated;

CREATE INDEX IF NOT EXISTS checklist_fill_sessions_est_approved_score_idx
  ON public.checklist_fill_sessions (establishment_id, dossier_approved_at DESC)
  WHERE dossier_approved_at IS NOT NULL
    AND score_percentage IS NOT NULL;
