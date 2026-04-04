import Link from "next/link";
import { notFound } from "next/navigation";

import { DeletePatientButton } from "@/components/pacientes/delete-patient-button";
import { NutritionAssessmentsSection } from "@/components/pacientes/nutrition-assessments-section";
import { PatientForm } from "@/components/pacientes/patient-form";
import { Separator } from "@/components/ui/separator";
import { loadPatientById } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

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

  const backHref = row.establishment_id
    ? `/clientes/${row.client_id}/estabelecimentos/${row.establishment_id}/editar`
    : `/clientes/${row.client_id}/editar`;

  const backLabel = row.establishment_id
    ? "← Estabelecimento"
    : "← Cliente";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        {backLabel}
      </Link>
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Editar paciente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{row.full_name}</p>
        {avaliacaoOk ? (
          <p className="text-muted-foreground mt-2 text-sm" role="status">
            Avaliação nutricional registada.
          </p>
        ) : null}
        <p className="mt-3">
          <Link
            href={`/pacientes/${row.id}/historico`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-foreground",
            )}
          >
            Histórico consolidado
          </Link>
        </p>
      </div>
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
      <Separator />
      <NutritionAssessmentsSection patientId={row.id} />
      <Separator />
      <div>
        <h2 className="text-foreground text-sm font-medium">
          Zona de perigo
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Eliminar remove o paciente do registo. Dados sensíveis devem ser
          tratados conforme LGPD.
        </p>
        <div className="mt-3">
          <DeletePatientButton patientId={row.id} />
        </div>
      </div>
    </div>
  );
}
