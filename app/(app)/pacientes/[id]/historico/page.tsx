import { notFound } from "next/navigation";

import { ConsolidatedTimeline } from "@/components/pacientes/consolidated-timeline";
import { PatientResponsibleHistorySection } from "@/components/pacientes/patient-responsible-history-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadConsolidatedNutritionHistory } from "@/lib/actions/patient-history";
import { loadPatientResponsibleHistory } from "@/lib/actions/patient-responsible-history";
import { loadPatientById } from "@/lib/actions/patients";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

export default async function HistoricoPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const [
    {
      patientFullName,
      mergeByDocument,
      linkedPatientCount,
      documentOnFile,
      events,
    },
    { currentResponsibleName, events: responsibleEvents },
  ] = await Promise.all([
    loadConsolidatedNutritionHistory(id),
    loadPatientResponsibleHistory(id),
  ]);

  if (!patientFullName) {
    notFound();
  }

  const contextMessage = mergeByDocument
    ? `Vista unificada por CPF (${linkedPatientCount} fichas com o mesmo documento). Cada evento indica a origem (estabelecimento ou atendimento particular).`
    : documentOnFile
      ? "Só existe uma ficha com este CPF. Se criar outra com o mesmo documento noutro estabelecimento, as avaliações passam a aparecer juntas aqui."
      : "Sem CPF na ficha: vê apenas avaliações deste registo. Adicione o CPF para unir o histórico entre estabelecimentos (mesmo documento na sua conta).";

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/pacientes/${id}`,
    fallbackLabel: "Prontuário",
    currentPath: `/pacientes/${id}/historico`,
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Histórico consolidado"
        description={`${patientFullName} · ${contextMessage}`}
        back={back}
      />

      <PatientResponsibleHistorySection
        currentResponsibleName={currentResponsibleName}
        events={responsibleEvents}
      />

      <section className="space-y-4" aria-labelledby="nutrition-history-heading">
        <div>
          <h2
            id="nutrition-history-heading"
            className="text-foreground text-lg font-semibold tracking-tight"
          >
            Avaliações nutricionais
          </h2>
          <p className="text-muted-foreground text-sm">
            Registos clínicos consolidados por CPF, quando aplicável.
          </p>
        </div>
        <ConsolidatedTimeline events={events} />
      </section>
    </PageLayout>
  );
}
