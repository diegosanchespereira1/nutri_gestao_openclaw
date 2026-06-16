import { AdultNutritionAssessmentsSection } from "@/components/pacientes/adult-nutrition-assessments-section";
import { ChildAssessmentsSection } from "@/components/pacientes/child-assessments-section";
import { GeriatricAssessmentsSection } from "@/components/pacientes/geriatric-assessments-section";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentHistoryItem } from "@/components/pacientes/nutrition-assessment-history-item";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import type { ChildSex } from "@/lib/nutrition/child/types";
import {
  ageCategoryFromYears,
  assessmentVisibilityForCategory,
} from "@/lib/pacientes/age-category";

/**
 * Conteúdo do card "Avaliações nutricionais" na página do paciente.
 *
 * As avaliações especializadas (infantil/adulto/idoso) aparecem conforme a
 * faixa etária do paciente. A "Avaliação Geral" é sempre exibida.
 */
export async function NutritionAssessmentsSection({
  patientId,
  defaultAge,
  defaultSex,
  defaultBirthDate,
}: {
  patientId: string;
  defaultAge?: number;
  defaultSex?: ChildSex | null;
  defaultBirthDate?: string | null;
}) {
  const { rows } = await loadNutritionAssessmentsForPatient(patientId);
  const { showChild, showAdult, showGeriatric } = assessmentVisibilityForCategory(
    ageCategoryFromYears(defaultAge ?? null),
  );

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

  const childTabContent = (
    <ChildAssessmentsSection
      patientId={patientId}
      defaultSex={defaultSex}
      defaultBirthDate={defaultBirthDate}
    />
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
      childTab={childTabContent}
      adultTab={adultTabContent}
      geriatricTab={geriatricTabContent}
      showChild={showChild}
      showAdult={showAdult}
      showGeriatric={showGeriatric}
    />
  );
}
