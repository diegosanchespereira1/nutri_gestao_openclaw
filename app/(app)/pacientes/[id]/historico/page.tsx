import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsolidatedTimeline } from "@/components/pacientes/consolidated-timeline";
import { loadConsolidatedNutritionHistory } from "@/lib/actions/patient-history";
import { loadPatientById } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function HistoricoPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const {
    patientFullName,
    mergeByDocument,
    linkedPatientCount,
    documentOnFile,
    events,
  } = await loadConsolidatedNutritionHistory(id);

  if (!patientFullName) {
    notFound();
  }

  const backHref = `/pacientes/${id}/editar`;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        ← Editar paciente
      </Link>

      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Histórico consolidado
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{patientFullName}</p>
        {mergeByDocument ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Vista unificada por <span className="text-foreground">CPF</span>{" "}
            ({linkedPatientCount} fichas com o mesmo documento). Cada evento
            indica a <span className="text-foreground">origem</span>{" "}
            (estabelecimento ou atendimento particular).
          </p>
        ) : documentOnFile ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Só existe uma ficha com este CPF. Se criar outra com o mesmo
            documento noutro estabelecimento, as avaliações passam a aparecer
            juntas aqui.
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            Sem CPF na ficha: vê apenas avaliações deste registo. Adicione o CPF
            para unir o histórico entre estabelecimentos (mesmo documento na sua
            conta).
          </p>
        )}
      </div>

      <ConsolidatedTimeline events={events} />
    </div>
  );
}
