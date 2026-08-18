export type PatientGroup =
  | "mulher_branca"
  | "mulher_negra"
  | "homem_branco"
  | "homem_negro";

export type NutritionalRisk = "s_rn" | "c_rn";

/** Método de percentil CB/DCT/CMB escolhido pelo profissional na avaliação. */
export type AnthropometricReference = "frisancho" | "nhanes";

export const ANTHROPOMETRIC_REFERENCE_LABELS: Record<AnthropometricReference, string> = {
  frisancho: "Frisancho, 1999",
  nhanes: "NHANES III",
};

export function parsePatientGroup(
  raw: FormDataEntryValue | string | null | undefined,
): PatientGroup | null {
  const s = String(raw ?? "").trim();
  if (
    s === "mulher_branca" ||
    s === "mulher_negra" ||
    s === "homem_branco" ||
    s === "homem_negro"
  ) {
    return s;
  }
  return null;
}

export function parseAnthropometricReference(
  raw: FormDataEntryValue | string | null | undefined,
): AnthropometricReference | null {
  const s = String(raw ?? "").trim();
  if (s === "frisancho" || s === "nhanes") return s;
  return null;
}

/** Pré-preenche a nova avaliação com o método da última; legado usa o fallback. */
export function defaultAnthropometricReference(
  lastStored: AnthropometricReference | null | undefined,
  hasPreviousAssessments: boolean,
  fallback: AnthropometricReference,
): AnthropometricReference | "" {
  if (lastStored === "frisancho" || lastStored === "nhanes") return lastStored;
  if (hasPreviousAssessments) return fallback;
  return "";
}

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
  /** Null em avaliações anteriores à coluna (fallback por tipo de avaliação). */
  anthropometric_reference: AnthropometricReference | null;
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
