import type { SupabaseClient } from "@supabase/supabase-js";

export type VisitAssigneeFormContext = {
  /** ID em team_members do utilizador autenticado, se existir. */
  currentTeamMemberId: string | null;
  /** Rótulo da opção «Eu» no select. */
  selfAssigneeLabel: string;
  /** Valor inicial do select de profissional. */
  defaultAssigneeId: string;
};

export async function loadCurrentUserAssigneeContext(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<VisitAssigneeFormContext> {
  const [{ data: tm }, { data: profile }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name")
      .eq("member_user_id", authUserId)
      .eq("owner_user_id", workspaceOwnerId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", authUserId)
      .maybeSingle(),
  ]);

  const selfName =
    (profile?.full_name as string | undefined)?.trim() ||
    (tm?.full_name as string | undefined)?.trim() ||
    "Eu";

  const currentTeamMemberId = (tm?.id as string | undefined) ?? null;

  return {
    currentTeamMemberId,
    selfAssigneeLabel: `Eu (${selfName})`,
    defaultAssigneeId: currentTeamMemberId ?? "",
  };
}
