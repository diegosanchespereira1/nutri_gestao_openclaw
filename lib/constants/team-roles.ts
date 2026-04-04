import type { TeamJobRole } from "@/lib/types/team-members";

export const TEAM_JOB_ROLES: readonly TeamJobRole[] = [
  "nutricionista",
  "nutricionista_estagiario",
  "tecnico_nutricao",
  "auxiliar",
  "administrativo",
  "gestao",
  "outro",
] as const;

export const teamJobRoleLabel: Record<TeamJobRole, string> = {
  nutricionista: "Nutricionista",
  nutricionista_estagiario: "Nutricionista estagiário(a)",
  tecnico_nutricao: "Técnico(a) de nutrição",
  auxiliar: "Auxiliar",
  administrativo: "Administrativo",
  gestao: "Gestão",
  outro: "Outro cargo",
};

export function parseTeamJobRole(raw: unknown): TeamJobRole | null {
  if (typeof raw !== "string") return null;
  return TEAM_JOB_ROLES.includes(raw as TeamJobRole)
    ? (raw as TeamJobRole)
    : null;
}
