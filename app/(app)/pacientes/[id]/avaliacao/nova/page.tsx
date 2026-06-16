import { notFound } from "next/navigation";

import { AdultNutritionAssessmentForm } from "@/components/pacientes/adult-nutrition-assessment-form";
import { ChildAssessmentForm } from "@/components/pacientes/child-assessment-form";
import { GeriatricAssessmentForm } from "@/components/pacientes/geriatric-assessment-form";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { loadPatientById } from "@/lib/actions/patients";
import type { ChildSex } from "@/lib/nutrition/child/types";
import {
  assessmentVisibilityForCategory,
  patientAgeCategory,
} from "@/lib/pacientes/age-category";

function calcDefaultAge(isoDate: string): number {
  return Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
}

export default async function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const birthSlice = row.birth_date ? String(row.birth_date).slice(0, 10) : null;
  const defaultAge = birthSlice ? calcDefaultAge(birthSlice) : undefined;
  const { showChild, showAdult, showGeriatric } = assessmentVisibilityForCategory(
    patientAgeCategory(row.birth_date),
  );
  const childSex: ChildSex | null =
    row.sex === "female" || row.sex === "male" ? row.sex : null;

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Realizar avaliação nutricional"
        description={row.full_name}
        back={{ href: `/pacientes/${id}`, label: "Prontuário" }}
      />

      <Card>
        <CardContent className="pt-6">
          <NutritionAssessmentsTabs
            showChild={showChild}
            showAdult={showAdult}
            showGeriatric={showGeriatric}
            generalTab={<NutritionAssessmentForm patientId={id} />}
            childTab={
              <ChildAssessmentForm
                patientId={id}
                defaultSex={childSex}
                defaultBirthDate={birthSlice}
              />
            }
            adultTab={
              <AdultNutritionAssessmentForm patientId={id} defaultAge={defaultAge} />
            }
            geriatricTab={
              <GeriatricAssessmentForm patientId={id} defaultAge={defaultAge} />
            }
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
