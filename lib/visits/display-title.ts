import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

export function visitDisplayTitle(row: ScheduledVisitWithTargets): string {
  if (row.target_type === "establishment" && row.establishments) {
    return row.establishments.name;
  }
  if (row.target_type === "patient" && row.patients) {
    return row.patients.full_name;
  }
  return row.target_type === "establishment"
    ? "Estabelecimento"
    : "Paciente";
}
