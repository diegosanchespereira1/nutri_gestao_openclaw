import type { VisitStatus } from "@/lib/types/visits";

export const visitStatusLabel: Record<VisitStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export function visitIsCancellable(status: VisitStatus): boolean {
  return status === "scheduled" || status === "in_progress";
}
