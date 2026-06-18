import { notFound } from "next/navigation";

import { ConsolidatedTimeline } from "@/components/pacientes/consolidated-timeline";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadConsolidatedNutritionHistory } from "@/lib/actions/patient-history";
import { loadPatientById } from "@/lib/actions/patients";

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

  const contextMessage = mergeByDocument
    ? `Vista unificada por CPF (${linkedPatientCount} fichas com o mesmo documento). Cada evento indica a origem (estabelecimento ou atendimento particular).`
    : documentOnFile
      ? "Só existe uma ficha com este CPF. Se criar outra com o mesmo documento noutro estabelecimento, as avaliações passam a aparecer juntas aqui."
      : "Sem CPF na ficha: vê apenas avaliações deste registo. Adicione o CPF para unir o histórico entre estabelecimentos (mesmo documento na sua conta).";

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Histórico consolidado"
        description={`${patientFullName} · ${contextMessage}`}
        back={{ href: `/pacientes/${id}`, label: "Prontuário" }}
      />

      <ConsolidatedTimeline events={events} />
    </PageLayout>
  );
}
