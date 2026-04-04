import type { VisitPriority } from "@/lib/types/visits";

export const VISIT_PRIORITIES: readonly VisitPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export const visitPriorityLabel: Record<VisitPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

/** Borda esquerda + fundo suave para cartões na agenda (legível e acessível). */
export const visitPriorityAgendaSurface: Record<VisitPriority, string> = {
  low: "border-l-sky-600/70 bg-sky-500/[0.06]",
  normal: "border-l-primary bg-primary/[0.06]",
  high: "border-l-amber-600 bg-amber-500/[0.1]",
  urgent: "border-l-destructive bg-destructive/[0.08]",
};

export function parseVisitPriority(raw: unknown): VisitPriority | null {
  if (typeof raw !== "string") return null;
  return VISIT_PRIORITIES.includes(raw as VisitPriority)
    ? (raw as VisitPriority)
    : null;
}
