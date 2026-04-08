import { notFound } from "next/navigation";

import { DeleteEstablishmentButton } from "@/components/clientes/delete-establishment-button";
import { EstablishmentComplianceDeadlinesSection } from "@/components/clientes/establishment-compliance-deadlines-section";
import { EstablishmentForm } from "@/components/clientes/establishment-form";
import { PatientsSection } from "@/components/pacientes/patients-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  loadComplianceDeadlinesForEstablishment,
} from "@/lib/actions/compliance-deadlines";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentRow } from "@/lib/types/establishments";

export default async function EditarEstabelecimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; estId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: clientId, estId } = await params;
  const sp = await searchParams;
  const blockedPatients =
    typeof sp.blocked === "string" ? sp.blocked === "patients" : false;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, kind, legal_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    notFound();
  }

  const { data: est, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("id", estId)
    .maybeSingle();

  if (error || !est || est.client_id !== clientId) {
    notFound();
  }

  const row = est as EstablishmentRow;

  const [deadlines, { templates }] = await Promise.all([
    loadComplianceDeadlinesForEstablishment(row.id),
    loadChecklistCatalog(),
  ]);
  const templateOptions = templates.map((t) => ({
    id: t.id,
    label: `${t.name} (${t.portaria_ref})`,
  }));

  return (
    <PageLayout variant="form">
      <PageHeader
        title={row.name}
        description="Dados do estabelecimento, prazos de compliance e pacientes associados."
        back={{ href: `/clientes/${clientId}/editar`, label: client.legal_name }}
      />

      {/* ── Seção 1: Dados do estabelecimento ──────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Dados do estabelecimento</CardTitle>
          <CardDescription>
            Nome, tipo e morada utilizados nos relatórios de visita.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <EstablishmentForm
            mode="edit"
            clientId={clientId}
            establishmentId={row.id}
            defaults={{
              name: row.name,
              establishment_type: row.establishment_type,
              address_line1: row.address_line1,
              address_line2: row.address_line2 ?? "",
              city: row.city ?? "",
              state: row.state ?? "",
              postal_code: row.postal_code ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* ── Seção 2: Compliance e prazos regulatórios ─────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Compliance regulatório</CardTitle>
          <CardDescription>
            Prazos de portarias e obrigações legais deste estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <EstablishmentComplianceDeadlinesSection
            clientId={clientId}
            establishmentId={row.id}
            establishmentName={row.name}
            initialRows={deadlines}
            templateOptions={templateOptions}
          />
        </CardContent>
      </Card>

      {/* ── Seção 3: Pacientes ─────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Pacientes</CardTitle>
          <CardDescription>
            Pacientes vinculados a este estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {blockedPatients ? (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              Não é possível eliminar o estabelecimento enquanto existirem
              pacientes associados. Transfira ou elimine os pacientes primeiro.
            </p>
          ) : null}
          <PatientsSection
            variant="establishment"
            clientId={clientId}
            establishmentId={row.id}
            establishmentName={row.name}
          />
        </CardContent>
      </Card>

      {/* ── Seção 4: Zona de perigo ────────────────────────── */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">
          Zona de perigo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eliminar remove o estabelecimento permanentemente. Pacientes ou visitas
          futuras deixarão de o referenciar.
        </p>
        <div className="mt-4">
          <DeleteEstablishmentButton
            establishmentId={row.id}
            clientId={clientId}
          />
        </div>
      </div>
    </PageLayout>
  );
}
