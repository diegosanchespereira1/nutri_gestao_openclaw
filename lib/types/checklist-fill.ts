import type { ChecklistTemplateSectionWithItems } from "@/lib/types/checklists";

/** Limite de caracteres para anotação opcional por item (FR20). */
export const MAX_CHECKLIST_ITEM_ANNOTATION_CHARS = 4000;

export type ChecklistFillOutcome = "conforme" | "nc" | "na";

export type ChecklistFillSessionRow = {
  id: string;
  user_id: string;
  establishment_id: string;
  template_id: string | null;
  custom_template_id?: string | null;
  scheduled_visit_id?: string | null;
  /** Quando definido, o dossiê foi aprovado e as respostas/fotos não podem mudar (FR23/FR70). */
  dossier_approved_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistFillItemResponseRow = {
  id: string;
  session_id: string;
  template_item_id: string | null;
  custom_item_id: string | null;
  outcome: ChecklistFillOutcome;
  note: string | null;
  item_annotation?: string | null;
  created_at: string;
  updated_at: string;
};

export type FillItemResponseState = {
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  /** Nota de contexto opcional (guardada em `item_annotation`). */
  annotation: string | null;
};

export type SectionValidationIssue = {
  item_id: string;
  message: string;
};

/** Respostas indexadas por id do item (global ou personalizado). */
export type FillResponsesMap = Record<string, FillItemResponseState>;

export function validateChecklistSection(
  section: ChecklistTemplateSectionWithItems,
  responses: FillResponsesMap,
): SectionValidationIssue[] {
  const issues: SectionValidationIssue[] = [];
  for (const item of section.items) {
    const r = responses[item.id];
    const outcome = r?.outcome ?? null;
    const note = (r?.note ?? "").trim();

    if (item.is_required) {
      if (outcome === null) {
        issues.push({
          item_id: item.id,
          message: "Indique Conforme ou Não conforme (obrigatório).",
        });
        continue;
      }
      if (outcome === "na") {
        issues.push({
          item_id: item.id,
          message: "Itens obrigatórios não podem ser marcados como Não aplicável.",
        });
        continue;
      }
      if (outcome === "nc" && note.length === 0) {
        issues.push({
          item_id: item.id,
          message: "Descreva a não conformidade (campo obrigatório).",
        });
      }
    } else {
      if (outcome === "nc" && note.length === 0) {
        issues.push({
          item_id: item.id,
          message: "Se assinalou Não conforme, descreva o motivo.",
        });
      }
    }
  }
  return issues;
}
