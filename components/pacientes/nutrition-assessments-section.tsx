import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import {
  buildAssessmentSummaryLine,
  formatAssessmentRecordedAt,
} from "@/lib/utils/nutrition-assessment-display";
import { Separator } from "@/components/ui/separator";

function AssessmentHistoryCard({ row }: { row: NutritionAssessmentRow }) {
  const summary = buildAssessmentSummaryLine(row);

  return (
    <li className="border-border rounded-lg border">
      <details className="group">
        <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-foreground flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="font-medium">
              {formatAssessmentRecordedAt(row.recorded_at)}
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              {summary}
            </span>
          </span>
        </summary>
        <div className="border-border space-y-3 border-t px-4 py-3 text-sm">
          {row.diet_notes ? (
            <div>
              <span className="text-muted-foreground font-medium">
                Alimentação / hábitos
              </span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">
                {row.diet_notes}
              </p>
            </div>
          ) : null}
          {row.clinical_notes ? (
            <div>
              <span className="text-muted-foreground font-medium">
                Notas clínicas
              </span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">
                {row.clinical_notes}
              </p>
            </div>
          ) : null}
          {row.goals ? (
            <div>
              <span className="text-muted-foreground font-medium">
                Objetivos
              </span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">
                {row.goals}
              </p>
            </div>
          ) : null}
          {!row.diet_notes && !row.clinical_notes && !row.goals ? (
            <p className="text-muted-foreground">
              Apenas dados antropométricos / atividade neste registo.
            </p>
          ) : null}
        </div>
      </details>
    </li>
  );
}

export async function NutritionAssessmentsSection({
  patientId,
}: {
  patientId: string;
}) {
  const { rows } = await loadNutritionAssessmentsForPatient(patientId);

  return (
    <section
      className="space-y-6"
      aria-labelledby="nutrition-assessments-heading"
    >
      <div>
        <h2
          id="nutrition-assessments-heading"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Avaliações nutricionais
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Formulário por secções (MVP). Cada registo fica com data e hora —
          histórico imutável para acompanhamento.
        </p>
      </div>

      <NutritionAssessmentForm patientId={patientId} />

      <Separator />

      <div>
        <h3 className="text-foreground mb-3 text-sm font-medium">Histórico</h3>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não há avaliações. Utilize o formulário acima para o primeiro
            registo.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Histórico de avaliações">
            {rows.map((r) => (
              <AssessmentHistoryCard key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
