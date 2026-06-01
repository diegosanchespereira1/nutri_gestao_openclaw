import type { SupabaseClient } from "@supabase/supabase-js";

import { canAccessAdminArea, type ProfileRole } from "@/lib/roles";

/** Titular da conta ou perfil admin/super_admin — vê todas as visitas do workspace. */
export function canViewAllWorkspaceVisits(
  authUserId: string,
  workspaceOwnerId: string,
  role: ProfileRole | null | undefined,
): boolean {
  return (
    authUserId === workspaceOwnerId || canAccessAdminArea(role ?? null)
  );
}

export async function resolveTeamMemberIdForAuthUser(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("member_user_id", authUserId)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export async function canManageScheduledVisit(args: {
  supabase: SupabaseClient;
  authUserId: string;
  workspaceOwnerId: string;
  role: ProfileRole | null | undefined;
  visit: {
    user_id: string;
    assigned_team_member_id: string | null;
  };
}): Promise<boolean> {
  const { supabase, authUserId, workspaceOwnerId, role, visit } = args;

  if (
    canViewAllWorkspaceVisits(authUserId, workspaceOwnerId, role)
  ) {
    return true;
  }

  if (visit.user_id === authUserId) return true;

  const teamMemberId = await resolveTeamMemberIdForAuthUser(
    supabase,
    authUserId,
    workspaceOwnerId,
  );
  if (
    teamMemberId &&
    visit.assigned_team_member_id === teamMemberId
  ) {
    return true;
  }

  return false;
}

/** Criador da visita ou titular/admin do workspace. */
export function canCancelScheduledVisit(
  authUserId: string,
  workspaceOwnerId: string,
  role: ProfileRole | null | undefined,
  visit: { user_id: string },
): boolean {
  return (
    visit.user_id === authUserId ||
    canViewAllWorkspaceVisits(authUserId, workspaceOwnerId, role)
  );
}
