import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ClipboardList, AlertTriangle } from "lucide-react";

import { ChecklistSessionHistoryCard } from "@/components/checklists/checklist-session-history-card";
import { ChecklistHistoryFilters } from "@/components/checklists/checklist-history-filters";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { loadChecklistSessionsForClient } from "@/lib/actions/checklist-history";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

const PAGE_SIZE = 20;

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

  // Verificar ownership
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

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const estFilter = sp.est ?? null;
  const statusFilter =
    sp.status === "aprovado" || sp.status === "em_andamento"
      ? sp.status
      : null;

  const { rows, total } = await loadChecklistSessionsForClient({
    clientId,
    establishmentId: estFilter,
    status: statusFilter,
    limit: PAGE_SIZE,
    offset,
  });

  // Métricas de resumo (sem filtros de est/status para cards de topo)
  const { rows: allRows } = await loadChecklistSessionsForClient({
    clientId,
    limit: 500,
    offset: 0,
  });

  const totalChecklists = allRows.length;
  const totalAprovados = allRows.filter((r) => r.status === "aprovado").length;
  const totalEmAndamento = allRows.filter((r) => r.status === "em_andamento").length;
  const totalNcsAbertas = allRows
    .filter((r) => r.status === "em_andamento")
    .reduce((acc, r) => acc + r.nc_count, 0);

  // Buscar estabelecimentos para filtro
  const { data: estRows } = await supabase
    .from("establishments")
    .select("id, name")
    .eq("client_id", clientId)
    .order("name");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildHref(params: Record<string, string | null>) {
    const base: Record<string, string> = {};
    if (estFilter) base.est = estFilter;
    if (statusFilter) base.status = statusFilter;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== null && v !== "") as [string, string][]
      ),
    ).toString();
    return `/clientes/${clientId}/checklists${qs ? `?${qs}` : ""}`;
  }

  return (
    <PageLayout variant="form">
      <PageHeader
        title={`Histórico de Checklists — ${client.legal_name}`}
        description="Todos os preenchimentos realizados nos estabelecimentos deste cliente."
        back={{ href: `/clientes/${clientId}/editar`, label: client.legal_name }}
      />

      {/* ─── Cards de resumo ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalChecklists}</p>
            <p className="text-xs text-muted-foreground">checklists realizados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-hidden />
              <span className="text-xs text-muted-foreground">Aprovados</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalAprovados}</p>
            <p className="text-xs text-muted-foreground">dossiês aprovados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-amber-500" aria-hidden />
              <span className="text-xs text-muted-foreground">Em andamento</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalEmAndamento}</p>
            <p className="text-xs text-muted-foreground">rascunhos abertos</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-500" aria-hidden />
              <span className="text-xs text-muted-foreground">NCs abertas</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalNcsAbertas}</p>
            <p className="text-xs text-muted-foreground">em rascunhos</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filtros ─────────────────────────────────────────────────────── */}
      <ChecklistHistoryFilters
        establishments={estRows ?? []}
        currentEst={estFilter}
        currentStatus={statusFilter}
        baseHref={`/clientes/${clientId}/checklists`}
      />

      {/* ─── Lista de sessões ─────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">
            {estFilter || statusFilter
              ? "Nenhum checklist encontrado com os filtros selecionados."
              : "Nenhum checklist realizado ainda neste cliente."}
          </p>
          <Link
            href="/checklists"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}
          >
            Ir ao catálogo de checklists
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((session) => (
            <ChecklistSessionHistoryCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* ─── Paginação ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total} checklists
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: page > 2 ? String(page - 1) : null })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
