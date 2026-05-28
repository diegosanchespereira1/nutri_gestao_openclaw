import Link from "next/link";
import { notFound } from "next/navigation";

import { EstablishmentPatientsList } from "@/components/pacientes/establishment-patients-list";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import { loadPatientsForScope } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";
import type { PatientRow } from "@/lib/types/patients";

export default async function EstabelecimentoPacientesPage({
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

  const { rows } = await loadPatientsForScope({
    variant: "establishment",
    clientId,
    establishmentId: estId,
  });

  const novoHref = `/clientes/${clientId}/estabelecimentos/${estId}/pacientes/novo`;
  const associarHref = `/clientes/${clientId}/estabelecimentos/${estId}/pacientes/associar`;

  return (
    <PageLayout variant="form">
      <PageHeader
        title={`Pacientes — ${establishment.name}`}
        description="Selecione um paciente para ver ou registar avaliações nutricionais."
        back={{
          href: `/clientes/${clientId}/estabelecimentos/${estId}/editar`,
          label: client?.legal_name ?? "Estabelecimento",
        }}
      />

      <EstablishmentPatientsList
        patients={rows as PatientRow[]}
        novoHref={novoHref}
        associateSlot={
          <Link
            href={associarHref}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Associar paciente existente
          </Link>
        }
      />
    </PageLayout>
  );
}
