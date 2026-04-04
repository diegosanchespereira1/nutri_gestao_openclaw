/** Evento na linha do tempo consolidada (avaliação + contexto). */
export type ConsolidatedNutritionEvent = {
  id: string;
  recorded_at: string;
  origin_label: string;
  summary_line: string;
  diet_notes: string | null;
  clinical_notes: string | null;
  goals: string | null;
};
