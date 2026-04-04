import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import type { ActivityLevel } from "@/lib/constants/activity-levels";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import { computeBmi } from "@/lib/utils/bmi";

export function toAssessmentNum(
  v: number | string | null | undefined,
): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatAssessmentRecordedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Resumo numérico / atividade para listas e timeline. */
export function buildAssessmentSummaryLine(
  row: NutritionAssessmentRow,
): string {
  const h = toAssessmentNum(row.height_cm);
  const w = toAssessmentNum(row.weight_kg);
  const waist = toAssessmentNum(row.waist_cm);
  const bmi = h && w ? computeBmi(h, w) : null;

  const activity =
    row.activity_level &&
    ACTIVITY_LEVELS.includes(row.activity_level as ActivityLevel)
      ? activityLevelLabel[row.activity_level as ActivityLevel]
      : null;

  const parts: string[] = [];
  if (h != null) parts.push(`${h} cm`);
  if (w != null) parts.push(`${w} kg`);
  if (bmi != null) parts.push(`IMC ${bmi}`);
  if (waist != null) parts.push(`cintura ${waist} cm`);
  if (activity) parts.push(activity);

  return parts.length > 0 ? parts.join(" · ") : "Sem medidas numéricas";
}
