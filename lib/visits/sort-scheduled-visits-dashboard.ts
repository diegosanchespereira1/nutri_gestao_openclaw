import type { ScheduledVisitWithTargets, VisitKind, VisitPriority } from "@/lib/types/visits";

const PRIORITY_ORDER: Record<VisitPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Secundário: tipos mais «regulatórios / institucionais» antes de clínico rotina.
 */
const KIND_ORDER: Record<VisitKind, number> = {
  audit: 0,
  technical_compliance: 1,
  training: 2,
  follow_up: 3,
  patient_care: 4,
  other: 5,
};

function priorityRank(p: VisitPriority): number {
  return PRIORITY_ORDER[p] ?? 99;
}

function kindRank(k: VisitKind | undefined): number {
  if (!k) return 99;
  return KIND_ORDER[k] ?? 99;
}

/**
 * Ordenação do dashboard: prioridade (urgente → baixa), tipo de visita, hora de início.
 */
export function compareScheduledVisitsForDashboard(
  a: ScheduledVisitWithTargets,
  b: ScheduledVisitWithTargets,
): number {
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;
  const kr =
    kindRank(a.visit_kind as VisitKind | undefined) -
    kindRank(b.visit_kind as VisitKind | undefined);
  if (kr !== 0) return kr;
  return (
    new Date(a.scheduled_start).getTime() -
    new Date(b.scheduled_start).getTime()
  );
}

export function sortScheduledVisitsForDashboard(
  list: ScheduledVisitWithTargets[],
): ScheduledVisitWithTargets[] {
  return [...list].sort(compareScheduledVisitsForDashboard);
}
