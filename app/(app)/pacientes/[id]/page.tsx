import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Pencil } from "lucide-react";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { PageLayout } from "@/components/layout/page-layout";
import { PatientAssessmentsBlock } from "@/components/pacientes/patient-assessments-block";
import { PatientHealthIndicatorsDashboard } from "@/components/pacientes/patient-health-indicators-dashboard";
import { PatientProntuarioDados } from "@/components/pacientes/patient-prontuario-dados";
import { PatientProntuarioTabs } from "@/components/pacientes/patient-prontuario-tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadAdultNutritionAssessmentsForPatient } from "@/lib/actions/adult-nutrition-assessments";
import { loadChildAssessmentsForPatient } from "@/lib/actions/child-assessments";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import { loadPatientById } from "@/lib/actions/patients";
import {
  buildCurrentUrl,
  getReturnToParam,
  resolveBackNavigation,
  withReturnTo,
} from "@/lib/navigation/return-to";
import { ageYearsFromBirth, patientAgeCategory } from "@/lib/pacientes/age-category";
import { getPatientPhotoSignedUrl } from "@/lib/patients/patient-photo-urls";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

function calcAgeYears(isoDate: string): number {
  const birth = new Date(isoDate);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return years;
}

export default async function PacientePage({
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
  const avaliacaoOk = sp.avaliacao === "ok";
  const dadosTab = sp.tab === "dados";

  const birthSlice = row.birth_date ? String(row.birth_date).slice(0, 10) : null;
  const ageLabel = birthSlice ? `${calcAgeYears(birthSlice)} anos` : null;

  const [
    { rows: adultRows },
    { rows: geriatricRows },
    { rows: childRows },
    photoUrl,
    clientResult,
    estResult,
    teamMemberResult,
    schoolGradeResult,
  ] = await Promise.all([
    loadAdultNutritionAssessmentsForPatient(id),
    loadGeriatricAssessmentsForPatient(id),
    loadChildAssessmentsForPatient(id),
    row.photo_storage_path
      ? getPatientPhotoSignedUrl(supabase, row.photo_storage_path)
      : Promise.resolve(null),
    row.client_id
      ? supabase
          .from("clients")
          .select("legal_name, trade_name, kind")
          .eq("id", row.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.establishment_id
      ? supabase
          .from("establishments")
          .select("name")
          .eq("id", row.establishment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.responsible_team_member_id
      ? supabase
          .from("team_members")
          .select("full_name")
          .eq("id", row.responsible_team_member_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.school_grade_id
      ? supabase
          .from("client_school_grades")
          .select("name")
          .eq("id", row.school_grade_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let category = patientAgeCategory(row.birth_date);
  if (!category) {
    if (geriatricRows.length > 0) category = "idoso";
    else if (childRows.length > 0) category = "crianca";
    else category = "adulto";
  }

  const isChild = category === "crianca";
  const isGeriatric = category === "idoso";
  const mode: "adult" | "geriatric" = isGeriatric ? "geriatric" : "adult";

  const rowsAsc = [...(isGeriatric ? geriatricRows : adultRows)].reverse();
  const childRowsAsc = isChild ? [...childRows].reverse() : undefined;

  const ageYears = ageYearsFromBirth(row.birth_date);
  const assessmentLabel =
    category === "crianca"
      ? "Avaliação infantil"
      : category === "idoso"
        ? "Avaliação para idosos"
        : "Avaliação adultos";

  const client = clientResult.data as {
    legal_name: string;
    trade_name: string | null;
    kind: string;
  } | null;
  const establishment = estResult.data as { name: string } | null;
  const teamMember = teamMemberResult.data as { full_name: string } | null;
  const schoolGrade = schoolGradeResult.data as { name: string } | null;

  const fallbackHref =
    row.establishment_id && row.client_id
      ? `/clientes/${row.client_id}/estabelecimentos/${row.establishment_id}/pacientes`
      : row.client_id
        ? `/clientes/${row.client_id}/editar`
        : "/pacientes";

  const fallbackLabel =
    row.establishment_id && row.client_id
      ? "Estabelecimento"
      : row.client_id
        ? "Cliente"
        : "Pacientes";

  const currentUrl = buildCurrentUrl(`/pacientes/${id}`, sp);
  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref,
    fallbackLabel,
    currentPath: `/pacientes/${id}`,
  });
  const novaAvaliacaoHref = withReturnTo(`/pacientes/${id}/avaliacao/nova`, currentUrl);
  const editarHref = withReturnTo(`/pacientes/${id}/editar`, currentUrl);

  const descriptionParts = [
    ageYears != null ? `${ageYears} anos` : null,
    row.sex ? SEX_LABEL[row.sex] : null,
    assessmentLabel,
    client ? client.legal_name : "Paciente particular",
  ].filter(Boolean);

  const successMessage = dadosTab
    ? "Informações complementares registradas com sucesso."
    : "Avaliação especializada registrada com sucesso.";

  return (
    <PageLayout variant="wide">
      {/* Topo no estilo do dashboard de indicadores (modelo novo): nome em destaque */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <Link
            href={back.href}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {back.label}
          </Link>

          <div className="flex min-w-0 items-center gap-4">
            <ClientAvatar
              name={row.full_name}
              imageUrl={photoUrl}
              size="xl"
              className="rounded-full"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paciente
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {row.full_name}
              </h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {descriptionParts.join(" · ") || "Sem informações"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={editarHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="mr-1.5 size-3.5" aria-hidden />
            Editar dados
          </Link>
          <Link href={novaAvaliacaoHref} className={cn(buttonVariants({ size: "sm" }))}>
            <ClipboardList className="mr-1.5 size-3.5" aria-hidden />
            Nova avaliação
          </Link>
        </div>
      </div>

      {avaliacaoOk ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">{successMessage}</p>
        </div>
      ) : null}

      <Suspense fallback={null}>
        <PatientProntuarioTabs
          indicadoresTab={
            <PatientHealthIndicatorsDashboard
              patientName={row.full_name}
              patientSubtitle={descriptionParts.slice(0, 3).join(" · ") || "Sem informações"}
              photoUrl={photoUrl}
              rowsAsc={rowsAsc}
              mode={mode}
              novaAvaliacaoHref={novaAvaliacaoHref}
              backHref={back.href}
              backLabel={back.label}
              editarHref={editarHref}
              exportPdfHref={`/pacientes/${id}/indicadores/pdf`}
              childRows={childRowsAsc}
              embedded
            />
          }
          dadosTab={
            <PatientProntuarioDados
              patientId={row.id}
              birthDate={row.birth_date}
              ageLabel={ageLabel}
              sex={row.sex}
              documentId={row.document_id}
              email={row.email}
              phone={row.phone}
              notes={row.notes}
              client={
                client
                  ? { legal_name: client.legal_name, trade_name: client.trade_name }
                  : null
              }
              establishmentName={establishment?.name ?? null}
              schoolGradeName={schoolGrade?.name ?? null}
              responsibleName={teamMember?.full_name ?? null}
            />
          }
          avaliacaoTab={
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <ClipboardList className="size-3.5" aria-hidden />
                  Avaliações especializadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PatientAssessmentsBlock
                  patientId={row.id}
                  birthDate={row.birth_date}
                  returnToOrigin={currentUrl}
                />
              </CardContent>
            </Card>
          }
        />
      </Suspense>
    </PageLayout>
  );
}
