import type { TeamMemberRow } from "@/lib/types/team-members";

export const ALL_PROFESSIONALS = "all";

export type VisitProfessionalFilterInput = {
  assigned_team_member_id: string | null;
  user_id: string;
  team_members?:
    | { full_name: string }
    | { full_name: string }[]
    | null;
  creator_full_name?: string | null;
};

export type VisitProfessionalOption = {
  value: string;
  label: string;
};

function normalizeEmbedName(
  rel:
    | { full_name: string }
    | { full_name: string }[]
    | null
    | undefined,
): string | null {
  if (rel == null) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  const name = row?.full_name?.trim();
  return name || null;
}

export function userProfessionalFilterKey(userId: string): string {
  return `user:${userId}`;
}

export function visitProfessionalFilterKey(
  visit: VisitProfessionalFilterInput,
): string {
  return visit.assigned_team_member_id ?? userProfessionalFilterKey(visit.user_id);
}

export function visitMatchesProfessionalFilter(
  visit: VisitProfessionalFilterInput,
  professionalId: string,
  memberUserIdByTeamMemberId: ReadonlyMap<string, string | null>,
): boolean {
  if (professionalId === ALL_PROFESSIONALS) return true;
  if (visit.assigned_team_member_id === professionalId) return true;
  if (visit.assigned_team_member_id) return false;
  if (professionalId === userProfessionalFilterKey(visit.user_id)) return true;
  const memberUserId = memberUserIdByTeamMemberId.get(professionalId);
  return Boolean(memberUserId && memberUserId === visit.user_id);
}

export function buildVisitProfessionalOptions(
  visits: VisitProfessionalFilterInput[],
  teamMembers: Pick<TeamMemberRow, "id" | "full_name" | "is_active">[],
): VisitProfessionalOption[] {
  const options: VisitProfessionalOption[] = [
    { value: ALL_PROFESSIONALS, label: "Todos os profissionais" },
  ];
  const seen = new Set<string>();

  for (const member of teamMembers) {
    if (!member.is_active) continue;
    seen.add(member.id);
    options.push({ value: member.id, label: member.full_name });
  }

  const extras: VisitProfessionalOption[] = [];
  for (const visit of visits) {
    const key = visitProfessionalFilterKey(visit);
    if (seen.has(key)) continue;
    seen.add(key);

    const assignedName = visit.assigned_team_member_id
      ? normalizeEmbedName(visit.team_members)
      : null;
    extras.push({
      value: key,
      label:
        assignedName ??
        visit.creator_full_name?.trim() ??
        "Titular",
    });
  }

  extras.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return [...options, ...extras];
}

export function parseProfessionalFilter(
  raw: string | null | undefined,
  options: readonly VisitProfessionalOption[],
): string {
  if (raw && options.some((option) => option.value === raw)) {
    return raw;
  }
  return ALL_PROFESSIONALS;
}
