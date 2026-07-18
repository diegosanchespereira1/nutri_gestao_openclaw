import { notFound } from "next/navigation";

import { ChecklistEvolutionExportDialog } from "@/components/checklists/checklist-evolution-export-dialog";
import { ChecklistScoreEvolutionChart } from "@/components/checklists/checklist-score-evolution-chart";
import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadChecklistScoreHistory } from "@/lib/actions/checklist-history";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { getServerContext } from "@/lib/supabase/get-server-user";

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

  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) notFound();

  const [{ data: client }, scoreHistory] = await Promise.all([
    supabase
      .from("clients")
      .select("id, legal_name, kind, owner_user_id")
      .eq("id", clientId)
      .maybeSingle(),
    loadChecklistScoreHistory(clientId),
  ]);

  if (!client || client.kind !== "pj") notFound();
  if (client.owner_user_id !== workspaceOwnerId) notFound();

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/clientes/${clientId}/editar?tab=checklists`,
    fallbackLabel: client.legal_name,
    currentPath: `/clientes/${clientId}/checklists`,
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title={`Histórico de Checklists — ${client.legal_name}`}
        description="Todos os preenchimentos realizados nos estabelecimentos deste cliente."
        back={back}
      />

      {scoreHistory.byTemplate.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Evolução da pontuação
            </h3>
            <ChecklistEvolutionExportDialog clientId={clientId} />
          </div>
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
