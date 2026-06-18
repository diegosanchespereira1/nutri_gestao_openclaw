export type ConsolidatedAssessmentKind =
  | "general"
  | "adult"
  | "geriatric"
  | "child";

/** Evento na linha do tempo consolidada (avaliação + contexto). */
export type ConsolidatedNutritionEvent = {
  id: string;
  recorded_at: string;
  origin_label: string;
  assessment_kind: ConsolidatedAssessmentKind;
  assessment_kind_label: string;
  summary_line: string;
  diet_notes: string | null;
  clinical_notes: string | null;
  goals: string | null;
  nutritional_diagnosis: string | null;
};
