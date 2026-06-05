import type { SupabaseClient } from "@supabase/supabase-js";

/** Última nota aprovada por cliente (via RPC — uma ida ao banco). */
export async function loadLatestClientChecklistScores(
  supabase: SupabaseClient,
  clientIds: string[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (clientIds.length === 0) return scores;

  const { data, error } = await supabase.rpc(
    "get_latest_checklist_scores_for_clients",
    { p_client_ids: clientIds },
  );

  if (error || !data) return scores;

  for (const row of data as Array<{
    client_id: string;
    score_percentage: number;
  }>) {
    scores.set(row.client_id, Number(row.score_percentage));
  }

  return scores;
}
