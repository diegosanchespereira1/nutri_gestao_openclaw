import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import type { ActivityLevel } from "@/lib/constants/activity-levels";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  type NutritionalRisk,
} from "@/lib/types/geriatric-assessments";
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
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
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

/** Resumo antropométrico para avaliações de adultos e idosos. */
export function buildAnthroAssessmentSummaryLine(row: {
  estimated_weight_kg: number | null;
  bmi: number | null;
  nutritional_risk: NutritionalRisk | null;
}): string {
  const pe = toAssessmentNum(row.estimated_weight_kg);
  const bmi = toAssessmentNum(row.bmi);
  const parts: string[] = [];

  if (pe != null) parts.push(`PE ${pe} kg`);
  if (bmi != null) parts.push(`IMC ${bmi}`);
  if (row.nutritional_risk) {
    const riskLabel = NUTRITIONAL_RISK_LABELS[row.nutritional_risk];
    parts.push(riskLabel.split("—")[0]?.trim() ?? riskLabel);
  }

  return parts.length > 0 ? parts.join(" · ") : "Sem medidas numéricas";
}

/** Resumo para avaliações infantis na timeline consolidada. */
export function buildChildAssessmentSummaryLine(row: ChildAssessmentRow): string {
  const w = toAssessmentNum(row.weight_kg);
  const h = toAssessmentNum(row.height_cm);
  const bmi = toAssessmentNum(row.bmi);
  const parts: string[] = [];

  if (w != null) parts.push(`${w} kg`);
  if (h != null) parts.push(`${h} cm`);
  if (bmi != null) parts.push(`IMC ${bmi}`);

  const results = Array.isArray(row.results) ? row.results : [];
  const imcResult = results.find((entry) => entry.indicator === "bmi_for_age");
  if (imcResult?.classification) {
    parts.push(imcResult.classification);
  }

  return parts.length > 0 ? parts.join(" · ") : "Sem medidas numéricas";
}
