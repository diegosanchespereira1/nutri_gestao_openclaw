import { ChevronDown } from "lucide-react";

import { ChildAssessmentResultCards } from "@/components/pacientes/child-assessment-result-cards";
import { assessChild } from "@/lib/nutrition/child/assess";
import { CHILD_METHOD_LABELS } from "@/lib/nutrition/child/labels";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";

function fmtDateFull(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function num(v: number | string | null): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number | null, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

function ageLabel(months: number): string {
  return `${Math.floor(months / 12)}a ${months % 12}m`;
}

export function ChildAssessmentHistoryItem({ row }: { row: ChildAssessmentRow }) {
  const weight = num(row.weight_kg);
  const height = num(row.height_cm);

  // Recalcula a partir dos dados salvos para garantir valor + faixa adequada
  // (e rótulos atuais) em todos os registos, inclusive os anteriores à mudança.
  const assessment = assessChild({
    sex: row.sex,
    ageMonths: row.age_months,
    weightKg: weight,
    heightCm: height,
    method: row.classification_method,
    armCircumferenceCm:    num(row.arm_circumference_cm    ?? null),
    tricepsSkinfoldMm:     num(row.triceps_skinfold_mm     ?? null),
    subscapularSkinfoldMm: num(row.subscapular_skinfold_mm ?? null),
    headCircumferenceCm:   num(row.head_circumference_cm   ?? null),
  });
  const bmi = assessment.bmi ?? num(row.bmi);
  const indicators = assessment.indicators;

  const summary = [
    ageLabel(row.age_months),
    bmi != null ? `IMC ${fmt(bmi)}` : null,
    indicators.find((i) => i.indicator === "bmi_for_age")?.classification ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm font-medium text-foreground">
              {fmtDateFull(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </div>
        </summary>

        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Peso</dt>
              <dd className="tabular-nums">{weight != null ? `${fmt(weight)} kg` : "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {row.measured_lying ? "Comprimento" : "Estatura"}
              </dt>
              <dd className="tabular-nums">{height != null ? `${fmt(height)} cm` : "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">IMC</dt>
              <dd className="font-mono font-semibold tabular-nums">
                {bmi != null ? `${fmt(bmi)} kg/m²` : "–"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Critério</dt>
              <dd>{CHILD_METHOD_LABELS[row.classification_method]}</dd>
            </div>
          </dl>

          {indicators.length > 0 && (
            <ChildAssessmentResultCards indicators={indicators} />
          )}

          {row.clinical_notes ? (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {row.clinical_notes}
            </p>
          ) : null}
        </div>
      </details>
    </li>
  );
}
