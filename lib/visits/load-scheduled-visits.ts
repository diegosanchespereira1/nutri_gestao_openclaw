import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

import {
  canViewAllWorkspaceVisits,
  resolveTeamMemberIdForAuthUser,
} from "./agenda-access";

export const SCHEDULED_VISITS_WITH_TARGETS_SELECT = `
  *,
  establishments ( id, name, client_id, clients ( legal_name, trade_name ) ),
  patients ( id, full_name ),
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
  return { rows: data as unknown as ScheduledVisitWithTargets[] };
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
  return { row: data as unknown as ScheduledVisitWithTargets };
}
