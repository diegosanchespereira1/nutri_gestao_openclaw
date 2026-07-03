import { AdultNutritionAssessmentsSection } from "@/components/pacientes/adult-nutrition-assessments-section";
import { ChildAssessmentsSection } from "@/components/pacientes/child-assessments-section";
import { GeriatricAssessmentsSection } from "@/components/pacientes/geriatric-assessments-section";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import type { ChildSex } from "@/lib/nutrition/child/types";
import {
  ageCategoryFromYears,
  assessmentVisibilityForCategory,
} from "@/lib/pacientes/age-category";

/**
 * Avaliações especializadas na página de edição do paciente.
 * As informações complementares ficam no card dedicado do prontuário.
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
  const { showChild, showAdult, showGeriatric } = assessmentVisibilityForCategory(
    ageCategoryFromYears(defaultAge ?? null),
  );

  return (
    <NutritionAssessmentsTabs
      showGeneral={false}
      childTab={
        <ChildAssessmentsSection
          patientId={patientId}
          defaultSex={defaultSex}
          defaultBirthDate={defaultBirthDate}
        />
      }
      adultTab={
        <AdultNutritionAssessmentsSection
          patientId={patientId}
          defaultAge={defaultAge}
        />
      }
      geriatricTab={
        <GeriatricAssessmentsSection patientId={patientId} defaultAge={defaultAge} />
      }
      showChild={showChild}
      showAdult={showAdult}
      showGeriatric={showGeriatric}
    />
  );
}
