export type PatientGroup =
  | "mulher_branca"
  | "mulher_negra"
  | "homem_branco"
  | "homem_negro";

export type NutritionalRisk = "s_rn" | "c_rn";

export type GeriatricAssessmentRow = {
  id: string;
  patient_id: string;
  recorded_at: string;
  patient_group: PatientGroup;
  has_amputation: boolean;
  amputation_segment_pct: number | null;
  age_years: number | null;
  cb_cm: number | null;
  dct_mm: number | null;
  cp_cm: number | null;
  aj_cm: number | null;
  weight_real_kg: number | null;
  cmb_cm: number | null;
  estimated_weight_kg: number | null;
  estimated_height_m: number | null;
  bmi: number | null;
  kcal_per_kg: number | null;
  energy_needs_kcal: number | null;
  ptn_per_kg: number | null;
  protein_needs_g: number | null;
  nutritional_risk: NutritionalRisk | null;
  nutritional_diagnosis: string | null;
  clinical_notes: string | null;
};

export const PATIENT_GROUP_LABELS: Record<PatientGroup, string> = {
  mulher_branca: "Mulher Branca",
  mulher_negra: "Mulher Negra",
  homem_branco: "Homem Branco",
  homem_negro: "Homem Negro",
};

export const NUTRITIONAL_RISK_LABELS: Record<NutritionalRisk, string> = {
  s_rn: "S/RN — Sem risco nutricional",
  c_rn: "C/RN — Com risco nutricional",
};
