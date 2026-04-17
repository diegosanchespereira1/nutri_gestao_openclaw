import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * UUID do titular da conta (tenant): o próprio utilizador ou o `owner_user_id`
 * da linha em `team_members` quando o login é de um membro da equipa.
 */
export async function getWorkspaceAccountOwnerId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<string> {
  const { data } = await supabase
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", authUserId)
    .maybeSingle();

  if (data?.owner_user_id) return data.owner_user_id as string;
  return authUserId;
}
