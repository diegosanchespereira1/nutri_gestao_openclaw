export type NutritionAssessmentRow = {
  id: string;
  patient_id: string;
  recorded_at: string;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  activity_level: string | null;
  diet_notes: string | null;
  clinical_notes: string | null;
  goals: string | null;
};
