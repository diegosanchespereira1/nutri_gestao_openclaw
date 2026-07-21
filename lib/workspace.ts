import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * UUID do titular da conta (tenant): o próprio utilizador ou o `owner_user_id`
 * da linha em `team_members` quando o login é de um membro da equipa.
 *
 * Preferência: RPC SECURITY DEFINER (evita falhas/silêncios de RLS na leitura
 * de `team_members` e cookies desatualizados após mudança de vínculo).
 */
export async function getWorkspaceAccountOwnerId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<string> {
  const { data: rpcOwnerId, error: rpcError } = await supabase.rpc(
    "workspace_account_owner_id",
  );

  if (!rpcError && typeof rpcOwnerId === "string" && rpcOwnerId.length > 0) {
    return rpcOwnerId;
  }

  const { data } = await supabase
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (data?.owner_user_id) return data.owner_user_id as string;
  return authUserId;
}

/** Verdadeiro quando o utilizador autenticado é membro da equipa (não o titular). */
export function isTeamMember(
  authUserId: string,
  workspaceOwnerId: string,
): boolean {
  return authUserId !== workspaceOwnerId;
}

/** Cargos que podem ativar/desativar membros (além do titular e admin). */
const TEAM_ROLES_CAN_TOGGLE_MEMBER_ACTIVE = ["gestao", "administrativo"] as const;

/** Membro da equipa com cargo Gestão no workspace atual. */
export async function isWorkspaceGestaoMember(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  if (authUserId === workspaceOwnerId) return false;

  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("member_user_id", authUserId)
    .eq("job_role", "gestao")
    .eq("is_active", true)
    .maybeSingle();

  return !!data?.id;
}

/**
 * Membro ativo com cargo Gestão ou Administrativo no workspace atual.
 * Usado para ativar/desativar colegas (não inclui criar/editar/apagar).
 */
export async function isWorkspaceTeamActiveToggleMember(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  if (authUserId === workspaceOwnerId) return false;

  const { data } = await supabase
    .from("team_members")
    .select("id, job_role")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("member_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  const role = data?.job_role;
  return (
    typeof role === "string" &&
    (TEAM_ROLES_CAN_TOGGLE_MEMBER_ACTIVE as readonly string[]).includes(role)
  );
}

async function isPlatformAdmin(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", authUserId)
    .maybeSingle();

  return profile?.role === "admin" || profile?.role === "super_admin";
}

/** Titular, cargo Gestão ou admin/super_admin da plataforma. */
async function isOwnerGestaoOrPlatformAdmin(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  if (authUserId === workspaceOwnerId) return true;
  if (await isWorkspaceGestaoMember(supabase, authUserId, workspaceOwnerId)) {
    return true;
  }
  return isPlatformAdmin(supabase, authUserId);
}

/** Titular, cargo Gestão ou admin/super_admin da plataforma podem gerir a equipe. */
export async function canManageTeamMembers(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  return isOwnerGestaoOrPlatformAdmin(supabase, authUserId, workspaceOwnerId);
}

/**
 * Pode ativar/desativar membros do workspace.
 * Titular, Gestão, Administrativo ou admin/super_admin da plataforma.
 */
export async function canToggleTeamMemberActive(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  if (authUserId === workspaceOwnerId) return true;
  if (
    await isWorkspaceTeamActiveToggleMember(
      supabase,
      authUserId,
      workspaceOwnerId,
    )
  ) {
    return true;
  }
  return isPlatformAdmin(supabase, authUserId);
}

/**
 * Pode apagar clientes, estabelecimentos e pacientes do workspace
 * (titular, cargo Gestão ou admin/super_admin).
 */
export async function canDeleteWorkspaceMasterData(
  supabase: SupabaseClient,
  authUserId: string,
  workspaceOwnerId: string,
): Promise<boolean> {
  return isOwnerGestaoOrPlatformAdmin(supabase, authUserId, workspaceOwnerId);
}
