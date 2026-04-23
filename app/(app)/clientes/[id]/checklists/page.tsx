import { notFound } from "next/navigation";

import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export default async function ClientChecklistHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    est?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, kind, owner_user_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (client.owner_user_id !== workspaceOwnerId) {
    notFound();
  }

  return (
    <PageLayout variant="form">
      <PageHeader
        title={`Histórico de Checklists — ${client.legal_name}`}
        description="Todos os preenchimentos realizados nos estabelecimentos deste cliente."
        back={{ href: `/clientes/${clientId}/editar?tab=checklists`, label: client.legal_name }}
      />

      <ClientChecklistHistorySection
        clientId={clientId}
        embeddedInClientEdit={false}
        searchParams={{
          est: sp.est,
          status: sp.status,
          page: sp.page,
        }}
      />
    </PageLayout>
  );
}
