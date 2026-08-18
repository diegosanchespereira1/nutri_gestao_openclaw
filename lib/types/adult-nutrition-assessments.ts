/**
 * Mesma estrutura que a avaliação geriátrica (antropometria + prescrição + clínica),
 * persistida em `patient_adult_nutrition_assessments` com fórmulas de adultos.
 */
export type {
  PatientGroup,
  NutritionalRisk,
  AnthropometricReference,
} from "@/lib/types/geriatric-assessments";

export type { GeriatricAssessmentRow as AdultNutritionAssessmentRow } from "@/lib/types/geriatric-assessments";

export {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
  ANTHROPOMETRIC_REFERENCE_LABELS,
  parsePatientGroup,
  parseAnthropometricReference,
  defaultAnthropometricReference,
} from "@/lib/types/geriatric-assessments";
