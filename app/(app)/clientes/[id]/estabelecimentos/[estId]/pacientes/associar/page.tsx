import { notFound } from "next/navigation";

import { AssociatePatientSearch } from "@/components/pacientes/associate-patient-search";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/server";
import { loadUnassociatedPatientsForClient } from "@/lib/actions/patients";

export default async function AssociarPacientePage({
  params,
}: {
  params: Promise<{ id: string; estId: string }>;
}) {
  const { id: clientId, estId } = await params;
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

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Associar paciente"
        description={
          client?.legal_name
            ? `Selecione um paciente de ${client.legal_name} para associar a ${establishment.name}.`
            : `Selecione um paciente do cliente para associar a ${establishment.name}.`
        }
        back={{
          href: `/clientes/${clientId}/estabelecimentos/${estId}/pacientes`,
          label: `Pacientes — ${establishment.name}`,
        }}
      />

      <AssociatePatientSearch
        clientId={clientId}
        establishmentId={estId}
        candidates={candidates}
      />
    </PageLayout>
  );
}
