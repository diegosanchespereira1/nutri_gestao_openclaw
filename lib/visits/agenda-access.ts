import type { SupabaseClient } from "@supabase/supabase-js";

import { canAccessAdminArea, type ProfileRole } from "@/lib/roles";
import { isWorkspaceGestaoMember } from "@/lib/workspace";

/** Titular, Gestão ou admin/super_admin — vê todas as visitas do workspace. */
export function canViewAllWorkspaceVisits(
  authUserId: string,
  workspaceOwnerId: string,
  role: ProfileRole | null | undefined,
  isGestaoMember = false,
): boolean {
  return (
    authUserId === workspaceOwnerId ||
    canAccessAdminArea(role ?? null) ||
    isGestaoMember
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

/**
 * Quando o formulário deixa o profissional vazio («Eu»), associa automaticamente
 * o membro da equipa correspondente ao utilizador autenticado.
 */
export async function resolveAssignedTeamMemberIdOnCreate(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
  assignRaw: string,
): Promise<string | null> {
  const trimmed = assignRaw.trim();
  if (trimmed.length > 0) return trimmed;

  return resolveTeamMemberIdForAuthUser(
    supabase,
    authUserId,
    workspaceOwnerId,
  );
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

  // Titular / admin de plataforma: sem roundtrip em team_members.
  if (canViewAllWorkspaceVisits(authUserId, workspaceOwnerId, role, false)) {
    return true;
  }

  if (
    await isWorkspaceGestaoMember(supabase, authUserId, workspaceOwnerId)
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

/** Criador da visita ou titular/Gestão/admin do workspace. */
export function canCancelScheduledVisit(
  authUserId: string,
  workspaceOwnerId: string,
  role: ProfileRole | null | undefined,
  visit: { user_id: string },
  isGestaoMember = false,
): boolean {
  return (
    visit.user_id === authUserId ||
    canViewAllWorkspaceVisits(
      authUserId,
      workspaceOwnerId,
      role,
      isGestaoMember,
    )
  );
}
