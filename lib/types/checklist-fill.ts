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
  /** Área física avaliada nesta sessão (nullable). */
  area_id?: string | null;
  /** Nome da área resolvido via join — presente quando a query inclui establishment_areas. */
  area_name?: string | null;
  /** Quando definido, o dossiê foi aprovado e as respostas/fotos não podem mudar (FR23/FR70). */
  dossier_approved_at?: string | null;
  /** Pontuação percentual de conformidade (0-100), persistida ao aprovar o dossiê. */
  score_percentage?: number | null;
  /** Pontos obtidos (conforme × peso). */
  score_points_earned?: number | null;
  /** Pontos aplicáveis (total excluindo NA). */
  score_points_total?: number | null;
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
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
};

export type FillItemResponseState = {
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  /** Nota de contexto opcional (guardada em `item_annotation`). */
  annotation: string | null;
  /** Data de validade da análise (yyyy-mm-dd). */
  validUntil: string | null;
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
          message:
            "Indique Conforme, Não conforme ou Não aplicável (obrigatório).",
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
          message: "Se você marcou Não conforme, descreva o motivo.",
        });
      }
    }
  }
  return issues;
}

/** Valida todas as seções (ordem do modelo). Útil antes de compilar/aprovar o dossiê. */
export function validateChecklistTemplate(
  sections: ChecklistTemplateSectionWithItems[],
  responses: FillResponsesMap,
): SectionValidationIssue[] {
  const issues: SectionValidationIssue[] = [];
  for (const section of sections) {
    issues.push(...validateChecklistSection(section, responses));
  }
  return issues;
}
