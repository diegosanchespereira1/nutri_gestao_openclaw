import { notFound } from "next/navigation";

import { AssociatePatientSearch } from "@/components/pacientes/associate-patient-search";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadUnassociatedPatientsForClient } from "@/lib/actions/patients";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { createClient } from "@/lib/supabase/server";

export default async function AssociarPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; estId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id: clientId, estId }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const { data: establishment } = await supabase
    .from("establishments")
    .select("id, name, client_id")
    .eq("id", estId)
    .maybeSingle();

  if (!establishment || establishment.client_id !== clientId) {
    notFound();
  }

  const { data: client } = await supabase
    .from("clients")
    .select("legal_name")
    .eq("id", clientId)
    .maybeSingle();

  const { rows: candidates } = await loadUnassociatedPatientsForClient(clientId);

  const fallbackHref = `/clientes/${clientId}/estabelecimentos/${estId}/pacientes`;
  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref,
    fallbackLabel: `Pacientes — ${establishment.name}`,
    currentPath: `/clientes/${clientId}/estabelecimentos/${estId}/pacientes/associar`,
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Associar paciente"
        description={
          client?.legal_name
            ? `Selecione um paciente de ${client.legal_name} para associar a ${establishment.name}.`
            : `Selecione um paciente do cliente para associar a ${establishment.name}.`
        }
        back={back}
      />

      <AssociatePatientSearch
        clientId={clientId}
        establishmentId={estId}
        candidates={candidates}
      />
    </PageLayout>
  );
}
