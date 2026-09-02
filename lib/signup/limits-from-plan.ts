import type { TenantLimits } from "@/lib/limits/tenant-limits";

type PlanCaps = {
  max_clients: number;
  max_patients: number;
  max_team_members: number;
};

/** Traduz os caps do catálogo (`-1` = ilimitado, `0` equipe = desligada) para tenant_limits. */
export function limitsPatchFromPlan(
  plan: PlanCaps,
): Pick<
  TenantLimits,
  | "clients_limit_enabled"
  | "clients_limit"
  | "patients_limit_enabled"
  | "patients_limit"
  | "team_members_enabled"
  | "team_members_unlimited"
  | "team_members_limit"
> {
  const clientsUnlimited = plan.max_clients < 0;
  const patientsUnlimited = plan.max_patients < 0;
  const teamUnlimited = plan.max_team_members < 0;
  const teamDisabled = plan.max_team_members === 0;

  return {
    clients_limit_enabled: !clientsUnlimited,
    clients_limit: clientsUnlimited ? 0 : plan.max_clients,
    patients_limit_enabled: !patientsUnlimited,
    patients_limit: patientsUnlimited ? 0 : plan.max_patients,
    team_members_enabled: !teamDisabled,
    team_members_unlimited: teamUnlimited,
    team_members_limit: teamUnlimited ? 0 : Math.max(0, plan.max_team_members),
  };
}
