import type {
  ChildColor,
  ChildIndicator,
  ChildSex,
  ClassificationMethod,
} from "@/lib/nutrition/child/types";

/** Resultado congelado de um indicador, como gravado em `results` (jsonb). */
export type ChildResultEntry = {
  indicator: ChildIndicator;
  value: number | null;
  percentile: number | null;
  z: number | null;
  boundary: "below_p1" | "above_p99" | null;
  classification: string | null;
  color: ChildColor | null;
  adequateLow: number | null;
  adequateHigh: number | null;
  outOfRange: boolean;
};

/** Linha da tabela patient_child_assessments. */
export type ChildAssessmentRow = {
  id: string;
  patient_id: string;
  recorded_at: string;
  sex: ChildSex;
  age_months: number;
  weight_kg: number | string | null;
  height_cm: number | string | null;
  measured_lying: boolean | null;
  classification_method: ClassificationMethod;
  bmi: number | string | null;
  results: ChildResultEntry[];
  clinical_notes: string | null;
  // Novos parâmetros WHO 0–60 meses
  arm_circumference_cm: number | string | null;
  triceps_skinfold_mm: number | string | null;
  subscapular_skinfold_mm: number | string | null;
  head_circumference_cm: number | string | null;
};
