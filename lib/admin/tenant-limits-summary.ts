/**
 * Resumo compacto de limites para os chips da lista de tenants (T4).
 * Puro — `lib/actions/**` está fora do include do vitest.
 */
import type { TenantLimits } from "@/lib/limits/tenant-limits";

export type TenantLimitsSummary = {
  clients: { used: number; limit: number | null };
  patients: { used: number; limit: number | null };
  teamMembers: { used: number; limit: number | null; enabled: boolean };
  atLimit: boolean;
};

export function buildLimitsSummary(
  limits: TenantLimits | null,
  usage: { clients: number; patients: number; teamMembers: number },
): TenantLimitsSummary {
  const clientsLimit = limits?.clients_limit_enabled ? limits.clients_limit : null;
  const patientsLimit = limits?.patients_limit_enabled ? limits.patients_limit : null;
  const teamEnabled = limits?.team_members_enabled ?? false;
  const teamLimit =
    teamEnabled && !limits?.team_members_unlimited
      ? (limits?.team_members_limit ?? 0)
      : null;

  const atLimit =
    (clientsLimit !== null && usage.clients >= clientsLimit) ||
    (patientsLimit !== null && usage.patients >= patientsLimit) ||
    (teamLimit !== null && usage.teamMembers >= teamLimit);

  return {
    clients: { used: usage.clients, limit: clientsLimit },
    patients: { used: usage.patients, limit: patientsLimit },
    teamMembers: { used: usage.teamMembers, limit: teamLimit, enabled: teamEnabled },
    atLimit,
  };
}

/** Texto do chip: `18/25` ou `18/∞`. Equipe desabilitada vira `—`. */
export function formatLimitChip(
  slot: { used: number; limit: number | null; enabled?: boolean },
): string {
  if (slot.enabled === false) return "—";
  return `${slot.used}/${slot.limit ?? "∞"}`;
}
