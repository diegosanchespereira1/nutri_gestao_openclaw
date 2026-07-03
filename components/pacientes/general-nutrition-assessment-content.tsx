import { TrendingUp } from "lucide-react";

import { formSectionLegendClass } from "@/components/forms/form-section";
import {
  GeneralEvolutionCharts,
  type GeneralChartPoint,
} from "@/components/pacientes/assessment-evolution-charts";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentHistoryItem } from "@/components/pacientes/nutrition-assessment-history-item";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export async function GeneralNutritionAssessmentContent({
  patientId,
}: {
  patientId: string;
}) {
  const { rows } = await loadNutritionAssessmentsForPatient(patientId);

  const chartAsc = [...rows].reverse().slice(-20);
  const chartData: GeneralChartPoint[] = chartAsc.map((r) => ({
    date: fmtDate(r.recorded_at),
    weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
    waist_cm: r.waist_cm != null ? Number(r.waist_cm) : null,
  }));

  return (
    <div className="space-y-6" aria-label="Informações complementares">
      <NutritionAssessmentForm patientId={patientId} />

      {chartData.length >= 2 ? (
        <div className="border-t border-border pt-6">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            Evolução
          </p>
          <GeneralEvolutionCharts data={chartData} />
        </div>
      ) : null}

      <div className="border-t border-border pt-6">
        <h3 className={formSectionLegendClass}>Histórico de avaliações</h3>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não há avaliações. Use o formulário acima para o primeiro
            registro.
          </p>
        ) : (
          <ul
            className="mt-3 space-y-2"
            aria-label="Histórico de informações complementares"
          >
            {rows.map((r) => (
              <NutritionAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
