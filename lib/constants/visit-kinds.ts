import type { VisitKind } from "@/lib/types/visits";

export const VISIT_KINDS: readonly VisitKind[] = [
  "patient_care",
  "technical_compliance",
  "follow_up",
  "audit",
  "training",
  "other",
] as const;

export const visitKindLabel: Record<VisitKind, string> = {
  patient_care: "Visita clínica / paciente",
  technical_compliance: "Visita técnica / conformidade",
  follow_up: "Acompanhamento / retorno",
  audit: "Auditoria / inspeção",
  training: "Formação / capacitação",
  other: "Outro",
};

export function parseVisitKind(raw: unknown): VisitKind | null {
  if (typeof raw !== "string") return null;
  return VISIT_KINDS.includes(raw as VisitKind) ? (raw as VisitKind) : null;
}
