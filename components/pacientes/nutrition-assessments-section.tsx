import { AdultNutritionAssessmentsSection } from "@/components/pacientes/adult-nutrition-assessments-section";
import { GeriatricAssessmentsSection } from "@/components/pacientes/geriatric-assessments-section";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentHistoryItem } from "@/components/pacientes/nutrition-assessment-history-item";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";

/**
 * Conteúdo do card "Avaliações nutricionais" na página do paciente.
 *
 * Abas:
 * - Avaliação Geral — formulário padrão + histórico interativo (editar/eliminar)
 * - Avaliação Adultos — antropometria adulto
 * - Avaliação para Idosos — Chumlea idoso + histórico interativo
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
              <NutritionAssessmentHistoryItem key={r.id} row={r} />
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
