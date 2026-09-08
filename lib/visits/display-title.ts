import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole, TeamMemberRow } from "@/lib/types/team-members";

type TeamMemberLookup = Pick<
  TeamMemberRow,
  "id" | "full_name" | "job_role" | "member_user_id"
>;

function normalizeEmbed<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function clientDisplayName(
  clients:
    | { trade_name?: string | null; legal_name?: string | null }
    | null
    | undefined,
): string | null {
  if (!clients) return null;
  const trade = clients.trade_name?.trim();
  if (trade) return trade;
  const legal = clients.legal_name?.trim();
  return legal || null;
}

/** Nome do estabelecimento ou paciente (null se indisponível no embed). */
export function visitTargetName(
  row: ScheduledVisitWithTargets,
): string | null {
  if (row.target_type === "establishment") {
    const est = normalizeEmbed(row.establishments);
    const name = est?.name?.trim();
    if (name) return name;
    return clientDisplayName(est?.clients ?? null);
  }
  if (row.target_type === "patient") {
    const pat = normalizeEmbed(row.patients);
    const name = pat?.full_name?.trim();
    return name || null;
  }
  return null;
}

export function visitDisplayTitle(row: ScheduledVisitWithTargets): string {
  const name = visitTargetName(row);
  if (name) return name;
  return row.target_type === "establishment" ? "Estabelecimento" : "Paciente";
}

function assignedTeamMember(
  row: ScheduledVisitWithTargets,
): ScheduledVisitWithTargets["team_members"] {
  return normalizeEmbed(row.team_members);
}

/** Completa o profissional com a lista da equipe quando o embed da visita vem vazio. */
export function enrichVisitWithProfessional(
  visit: ScheduledVisitWithTargets,
  teamMembers: readonly TeamMemberLookup[],
): ScheduledVisitWithTargets {
  const assigned = assignedTeamMember(visit);
  if (assigned?.full_name?.trim()) {
    return { ...visit, team_members: assigned };
  }

  const member =
    (visit.assigned_team_member_id
      ? teamMembers.find((item) => item.id === visit.assigned_team_member_id)
      : undefined) ??
    teamMembers.find(
      (item) =>
        item.member_user_id != null && item.member_user_id === visit.user_id,
    );

  if (!member?.full_name.trim()) {
    return { ...visit, team_members: assigned };
  }

  return {
    ...visit,
    team_members: {
      id: member.id,
      full_name: member.full_name,
      job_role: member.job_role,
    },
  };
}

/** Só o nome, para blocos compactos da agenda. */
export function visitProfessionalName(
  row: ScheduledVisitWithTargets,
  creatorFullName?: string | null,
): string {
  const tm = assignedTeamMember(row);
  const assigned = tm?.full_name?.trim();
  if (assigned) return assigned;
  const creator = creatorFullName?.trim();
  if (creator) return creator;
  return "Profissional não indicado";
}

/** Nome do profissional responsável (membro atribuído ou criador da visita). */
export function visitProfessionalLabel(
  row: ScheduledVisitWithTargets,
  creatorFullName?: string | null,
): string {
  const tm = assignedTeamMember(row);
  if (tm?.full_name) {
    const role =
      teamJobRoleLabel[tm.job_role as TeamJobRole] ?? tm.job_role;
    return `${tm.full_name} (${role})`;
  }
  const creator = creatorFullName?.trim();
  if (creator) return creator;
  return "Profissional não indicado";
}
