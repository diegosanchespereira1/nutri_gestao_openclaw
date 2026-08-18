import { notFound } from "next/navigation";

import { AdultNutritionAssessmentForm } from "@/components/pacientes/adult-nutrition-assessment-form";
import { ChildAssessmentForm } from "@/components/pacientes/child-assessment-form";
import { GeriatricAssessmentForm } from "@/components/pacientes/geriatric-assessment-form";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadAdultNutritionAssessmentsForPatient } from "@/lib/actions/adult-nutrition-assessments";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import { loadPatientById } from "@/lib/actions/patients";
import type { ChildSex } from "@/lib/nutrition/child/types";
import {
  ageYearsFromBirth,
  assessmentVisibilityForCategory,
  patientAgeCategory,
} from "@/lib/pacientes/age-category";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { getPatientPhotoSignedUrl } from "@/lib/patients/patient-photo-urls";
import { createClient } from "@/lib/supabase/server";
import { defaultAnthropometricReference } from "@/lib/types/geriatric-assessments";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

const CATEGORY_ASSESSMENT_LABEL: Record<string, string> = {
  crianca: "Avaliação infantil",
  adulto: "Avaliação adultos",
  idoso: "Avaliação para idosos",
};

export default async function NovaAvaliacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const supabase = await createClient();
  const [photoUrl, { rows: adultRows }, { rows: geriatricRows }] = await Promise.all([
    row.photo_storage_path
      ? getPatientPhotoSignedUrl(supabase, row.photo_storage_path)
      : Promise.resolve(null),
    loadAdultNutritionAssessmentsForPatient(id),
    loadGeriatricAssessmentsForPatient(id),
  ]);

  const birthSlice = row.birth_date ? String(row.birth_date).slice(0, 10) : null;
  const ageYears = ageYearsFromBirth(row.birth_date);
  const defaultAge = ageYears ?? undefined;
  const category = patientAgeCategory(row.birth_date);
  const { showChild, showAdult, showGeriatric } =
    assessmentVisibilityForCategory(category);
  const childSex: ChildSex | null =
    row.sex === "female" || row.sex === "male" ? row.sex : null;

  const subtitle = [
    ageYears != null ? `${ageYears} anos` : null,
    row.sex ? SEX_LABEL[row.sex] : null,
    category ? CATEGORY_ASSESSMENT_LABEL[category] : "informações no prontuário",
  ]
    .filter(Boolean)
    .join(" · ");

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/pacientes/${id}`,
    fallbackLabel: "Indicadores",
    currentPath: `/pacientes/${id}/avaliacao/nova`,
  });

  return (
    <PageLayout variant="wide">
      <PageHeader
        title={row.full_name}
        description={`Realizar avaliação especializada · ${subtitle}`}
        leading={
          <ClientAvatar
            name={row.full_name}
            imageUrl={photoUrl}
            size="lg"
            className="rounded-full ring-2 ring-teal-400/50 ring-offset-2 ring-offset-background"
          />
        }
        back={back}
      />

      <NutritionAssessmentsTabs
        showGeneral={false}
        showChild={showChild}
        showAdult={showAdult}
        showGeriatric={showGeriatric}
        childTab={
          <ChildAssessmentForm
            patientId={id}
            defaultSex={childSex}
            defaultBirthDate={birthSlice}
          />
        }
        adultTab={
          <AdultNutritionAssessmentForm
            patientId={id}
            defaultAge={defaultAge}
            defaultAnthropometricReference={defaultAnthropometricReference(
              adultRows[0]?.anthropometric_reference,
              adultRows.length > 0,
              "frisancho",
            )}
          />
        }
        geriatricTab={
          <GeriatricAssessmentForm
            patientId={id}
            defaultAge={defaultAge}
            defaultAnthropometricReference={defaultAnthropometricReference(
              geriatricRows[0]?.anthropometric_reference,
              geriatricRows.length > 0,
              "nhanes",
            )}
          />
        }
      />
    </PageLayout>
  );
}
