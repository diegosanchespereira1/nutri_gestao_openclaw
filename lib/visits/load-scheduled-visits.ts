import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import { getWorkspaceAccountOwnerId, isWorkspaceGestaoMember } from "@/lib/workspace";

import {
  canViewAllWorkspaceVisits,
  resolveTeamMemberIdForAuthUser,
} from "./agenda-access";

export const SCHEDULED_VISITS_WITH_TARGETS_SELECT = `
  id,
  user_id,
  target_type,
  establishment_id,
  patient_id,
  scheduled_start,
  priority,
  status,
  visit_kind,
  assigned_team_member_id,
  notes,
  dossier_recipient_emails,
  dossier_email_send_status,
  dossier_email_last_error,
  dossier_email_sent_at,
  created_at,
  updated_at,
  establishments ( id, name, client_id, clients ( legal_name, trade_name ) ),
  patients ( id, full_name, client_id, clients ( legal_name, trade_name ) ),
  team_members ( id, full_name, job_role )
`.trim();

function defaultVisitsWindow(options?: { from?: string; to?: string }) {
  const now = new Date();
  return {
    from:
      options?.from ??
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 6,
          now.getUTCDate(),
        ),
      ).toISOString(),
    to:
      options?.to ??
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 90,
        ),
      ).toISOString(),
  };
}

/**
 * Visitas visíveis na agenda: titular/admin vê todas do workspace;
 * membro da equipa vê as que criou ou que lhe foram atribuídas.
 */
export async function loadScheduledVisitsForAgenda(args: {
  supabase: SupabaseClient;
  authUserId: string;
  workspaceOwnerId: string;
  role?: ProfileRole | null;
  from?: string;
  to?: string;
}): Promise<{ rows: ScheduledVisitWithTargets[] }> {
  const { from, to } = defaultVisitsWindow(args);

  let role = args.role;
  if (role === undefined) {
    const { data: profile } = await args.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", args.authUserId)
      .maybeSingle();
    role = (profile?.role as ProfileRole | null | undefined) ?? null;
  }

  let query = args.supabase
    .from("scheduled_visits")
    .select(SCHEDULED_VISITS_WITH_TARGETS_SELECT)
    .gte("scheduled_start", from)
    .lte("scheduled_start", to)
    .order("scheduled_start", { ascending: true });

  if (
    !canViewAllWorkspaceVisits(
      args.authUserId,
      args.workspaceOwnerId,
      role,
      await isWorkspaceGestaoMember(
        args.supabase,
        args.authUserId,
        args.workspaceOwnerId,
      ),
    )
  ) {
    const teamMemberId = await resolveTeamMemberIdForAuthUser(
      args.supabase,
      args.authUserId,
      args.workspaceOwnerId,
    );
    if (teamMemberId) {
      query = query.or(
        `user_id.eq.${args.authUserId},assigned_team_member_id.eq.${teamMemberId}`,
      );
    } else {
      query = query.eq("user_id", args.authUserId);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[loadScheduledVisitsForAgenda]", error.message);
    return { rows: [] };
  }
  if (!data) return { rows: [] };

  const rows = data as unknown as ScheduledVisitWithTargets[];
  return {
    rows: await attachVisitProfessionalNames(
      args.supabase,
      rows,
      args.workspaceOwnerId,
    ),
  };
}

function normalizeVisitTeamMember(
  row: ScheduledVisitWithTargets,
): ScheduledVisitWithTargets["team_members"] {
  const tm = row.team_members;
  if (tm == null) return null;
  return Array.isArray(tm) ? (tm[0] ?? null) : tm;
}

/**
 * Gestor não lê profiles de outras contas (RLS). O nome da nutri vem da
 * equipe do workspace, e só depois do próprio perfil quando for o caso.
 */
async function attachVisitProfessionalNames(
  supabase: SupabaseClient,
  rows: ScheduledVisitWithTargets[],
  workspaceOwnerId: string,
): Promise<ScheduledVisitWithTargets[]> {
  const normalized = rows.map((row) => ({
    ...row,
    team_members: normalizeVisitTeamMember(row),
  }));

  const needsCreator = normalized.filter((row) => !row.team_members);
  if (needsCreator.length === 0) return normalized;

  const userIds = [...new Set(needsCreator.map((row) => row.user_id))];
  const nameByUser = new Map<string, string>();

  const { data: teamRows } = await supabase
    .from("team_members")
    .select("member_user_id, full_name")
    .eq("owner_user_id", workspaceOwnerId)
    .in("member_user_id", userIds);

  for (const member of teamRows ?? []) {
    const userId = member.member_user_id as string | null;
    const fullName = (member.full_name as string | null)?.trim();
    if (userId && fullName) nameByUser.set(userId, fullName);
  }

  const missing = userIds.filter((id) => !nameByUser.has(id));
  if (missing.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", missing);

    for (const profile of profiles ?? []) {
      const fullName = (profile.full_name as string | null)?.trim();
      if (fullName) nameByUser.set(profile.user_id as string, fullName);
    }
  }

  return normalized.map((row) => ({
    ...row,
    creator_full_name: row.team_members
      ? null
      : (nameByUser.get(row.user_id) ?? null),
  }));
}

/**
 * Carrega visitas agendadas dentro de uma janela de tempo.
 * Por padrão busca 6 meses para trás + 90 dias para frente.
 */
export async function loadScheduledVisitsForOwner(options?: {
  from?: string;
  to?: string;
}): Promise<{ rows: ScheduledVisitWithTargets[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return loadScheduledVisitsForAgenda({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
    from: options?.from,
    to: options?.to,
  });
}

export async function loadCompletedVisitsForReport(args: {
  supabase: SupabaseClient;
  authUserId: string;
  workspaceOwnerId: string;
  role?: ProfileRole | null;
  from: string;
  to: string;
  isGestaoMember: boolean;
}): Promise<{ rows: ScheduledVisitWithTargets[] }> {
  if (
    !canViewAllWorkspaceVisits(
      args.authUserId,
      args.workspaceOwnerId,
      args.role,
      args.isGestaoMember,
    )
  ) {
    return { rows: [] };
  }

  const { data, error } = await args.supabase
    .from("scheduled_visits")
    .select(SCHEDULED_VISITS_WITH_TARGETS_SELECT)
    .eq("status", "completed")
    .gte("scheduled_start", args.from)
    .lte("scheduled_start", args.to)
    .order("scheduled_start", { ascending: true });

  if (error) {
    console.error("[loadCompletedVisitsForReport]", error.message);
    return { rows: [] };
  }

  return {
    rows: await attachVisitProfessionalNames(
      args.supabase,
      (data ?? []) as unknown as ScheduledVisitWithTargets[],
      args.workspaceOwnerId,
    ),
  };
}

export async function loadScheduledVisitById(
  id: string,
): Promise<{ row: ScheduledVisitWithTargets | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const { data, error } = await supabase
    .from("scheduled_visits")
    .select(SCHEDULED_VISITS_WITH_TARGETS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { row: null };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const [row] = await attachVisitProfessionalNames(
    supabase,
    [data as unknown as ScheduledVisitWithTargets],
    workspaceOwnerId,
  );

  return { row: row ?? null };
}
