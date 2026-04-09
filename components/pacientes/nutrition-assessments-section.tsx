import { AdultNutritionAssessmentsSection } from "@/components/pacientes/adult-nutrition-assessments-section";
import { GeriatricAssessmentsSection } from "@/components/pacientes/geriatric-assessments-section";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import {
  buildAssessmentSummaryLine,
  formatAssessmentRecordedAt,
} from "@/lib/utils/nutrition-assessment-display";

function AssessmentHistoryCard({ row }: { row: NutritionAssessmentRow }) {
  const summary = buildAssessmentSummaryLine(row);

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <details className="group">
        <summary className="cursor-pointer list-none px-4 py-3 transition-colors hover:bg-muted/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm font-medium text-foreground">
              {formatAssessmentRecordedAt(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </div>
        </summary>
        <div className="space-y-3 border-t border-border bg-card px-4 py-4 text-sm">
          {row.diet_notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Alimentação / hábitos
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {row.diet_notes}
              </p>
            </div>
          ) : null}
          {row.clinical_notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Notas clínicas
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {row.clinical_notes}
              </p>
            </div>
          ) : null}
          {row.goals ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Objetivos
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
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

/**
 * Conteúdo do card "Avaliações nutricionais" na página do paciente.
 *
 * Abas:
 * - Avaliação Geral — formulário padrão + histórico
 * - Avaliação Adultos — antropometria adulto (peso/altura estimados específicos)
 * - Avaliação para Idosos — Chumlea idoso + histórico
 *
 * As abas são um Client Component; o conteúdo de cada aba é Server-rendered
 * e passado como slot (ReactNode), respeitando o padrão RSC de composição.
 */
export async function NutritionAssessmentsSection({
  patientId,
  defaultAge,
}: {
  patientId: string;
  defaultAge?: number;
}) {
  const { rows } = await loadNutritionAssessmentsForPatient(patientId);

  const generalTabContent = (
    <div className="space-y-6" aria-label="Avaliações nutricionais gerais">
      <NutritionAssessmentForm patientId={patientId} />

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Histórico de avaliações
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há avaliações. Utilize o formulário acima para o primeiro
            registo.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Histórico de avaliações gerais">
            {rows.map((r) => (
              <AssessmentHistoryCard key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const adultTabContent = (
    <AdultNutritionAssessmentsSection
      patientId={patientId}
      defaultAge={defaultAge}
    />
  );

  const geriatricTabContent = (
    <GeriatricAssessmentsSection patientId={patientId} defaultAge={defaultAge} />
  );

  return (
    <NutritionAssessmentsTabs
      generalTab={generalTabContent}
      adultTab={adultTabContent}
      geriatricTab={geriatricTabContent}
    />
  );
}
