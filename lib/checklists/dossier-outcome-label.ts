import type { ChecklistFillOutcome } from "@/lib/types/checklist-fill";

export function formatChecklistOutcomeLabel(
  outcome: ChecklistFillOutcome | null,
): string {
  if (outcome === null) return "Sem avaliação";
  if (outcome === "conforme") return "Conforme";
  if (outcome === "nc") return "Não conforme";
  return "Não aplicável";
}
