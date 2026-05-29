import { notFound } from "next/navigation";

import { AdultNutritionAssessmentForm } from "@/components/pacientes/adult-nutrition-assessment-form";
import { GeriatricAssessmentForm } from "@/components/pacientes/geriatric-assessment-form";
import { NutritionAssessmentForm } from "@/components/pacientes/nutrition-assessment-form";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { loadPatientById } from "@/lib/actions/patients";

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
  const isMinor = defaultAge !== undefined && defaultAge < 18;

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
            showAdultTabs={!isMinor}
            generalTab={<NutritionAssessmentForm patientId={id} />}
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
