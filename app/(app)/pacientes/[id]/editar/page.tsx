import Link from "next/link";
import { notFound } from "next/navigation";

import { DeletePatientButton } from "@/components/pacientes/delete-patient-button";
import { NutritionAssessmentsSection } from "@/components/pacientes/nutrition-assessments-section";
import { PatientForm } from "@/components/pacientes/patient-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadPatientById } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";

export default async function EditarPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const avaliacaoOk =
    typeof sp.avaliacao === "string" && sp.avaliacao === "ok";

  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const birthSlice = row.birth_date
    ? String(row.birth_date).slice(0, 10)
    : "";

  // Idade aproximada para pré-preencher o campo na avaliação geriátrica
  const defaultAge = birthSlice
    ? Math.floor(
        (Date.now() - new Date(birthSlice).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : undefined;

  const backHref = row.establishment_id
    ? `/clientes/${row.client_id}/estabelecimentos/${row.establishment_id}/editar`
    : `/clientes/${row.client_id}/editar`;

  const backLabel = row.establishment_id ? "Estabelecimento" : "Cliente";

  return (
    <PageLayout variant="form">
      {/* Cabeçalho */}
      <PageHeader
        title={row.full_name}
        description="Dados cadastrais e avaliações nutricionais do paciente."
        back={{ href: backHref, label: backLabel }}
        actions={
          <Link
            href={`/pacientes/${row.id}/historico`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver histórico
          </Link>
        }
      />

      {/* Feedback de avaliação guardada */}
      {avaliacaoOk ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">
            Avaliação nutricional registada com sucesso.
          </p>
        </div>
      ) : null}

      {/* ── Seção 1: Dados do paciente ─────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Dados do paciente</CardTitle>
          <CardDescription>
            Nome, data de nascimento, contacto e notas clínicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PatientForm
            mode="edit"
            patientId={row.id}
            clientId={row.client_id}
            establishmentId={row.establishment_id}
            defaults={{
              full_name: row.full_name,
              birth_date: birthSlice,
              document_id: row.document_id ?? "",
              sex: row.sex,
              phone: row.phone ?? "",
              email: row.email ?? "",
              notes: row.notes ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* ── Seção 2: Avaliações nutricionais ───────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Avaliações nutricionais</CardTitle>
          <CardDescription>
            Registe medidas antropométricas, hábitos e objetivos. Cada registo
            é imutável e forma o histórico de acompanhamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <NutritionAssessmentsSection patientId={row.id} defaultAge={defaultAge} />
        </CardContent>
      </Card>

      {/* ── Seção 3: Zona de perigo ─────────────────────────────── */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">
          Zona de perigo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eliminar remove o paciente do registo permanentemente. Dados sensíveis
          devem ser tratados conforme a LGPD.
        </p>
        <div className="mt-4">
          <DeletePatientButton patientId={row.id} />
        </div>
      </div>
    </PageLayout>
  );
}
