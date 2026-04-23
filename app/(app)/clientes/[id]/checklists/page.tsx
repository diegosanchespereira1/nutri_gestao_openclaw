import { notFound } from "next/navigation";

import { ChecklistScoreEvolutionChart } from "@/components/checklists/checklist-score-evolution-chart";
import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadChecklistScoreHistory } from "@/lib/actions/checklist-history";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export default async function ClientChecklistHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    est?: string;
    area?: string;
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

  const scoreHistory = await loadChecklistScoreHistory(clientId);

  return (
    <PageLayout variant="form">
      <PageHeader
        title={`Histórico de Checklists — ${client.legal_name}`}
        description="Todos os preenchimentos realizados nos estabelecimentos deste cliente."
        back={{ href: `/clientes/${clientId}/editar?tab=checklists`, label: client.legal_name }}
      />

      {scoreHistory.byTemplate.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Evolução da pontuação
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pontuação por dossiê aprovado — cada linha representa um template de checklist.
          </p>
          <div className="mt-4">
            <ChecklistScoreEvolutionChart byTemplate={scoreHistory.byTemplate} />
          </div>
        </div>
      )}

      <ClientChecklistHistorySection
        clientId={clientId}
        embeddedInClientEdit={false}
        searchParams={{
          est: sp.est,
          area: sp.area,
          status: sp.status,
          page: sp.page,
        }}
      />
    </PageLayout>
  );
}
