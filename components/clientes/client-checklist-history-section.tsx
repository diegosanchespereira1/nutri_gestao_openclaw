import Link from "next/link";
import { CheckCircle2, Clock, ClipboardList, AlertTriangle } from "lucide-react";

import { ChecklistSessionHistoryCard } from "@/components/checklists/checklist-session-history-card";
import { ChecklistHistoryFilters } from "@/components/checklists/checklist-history-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { loadChecklistSessionsForClient } from "@/lib/actions/checklist-history";
import { isDossierEmailDeliveryConfigured } from "@/lib/dossier-email-delivery";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export type ClientChecklistHistorySectionProps = {
  clientId: string;
  /** Quando true, URLs de filtro/paginação usam `/clientes/:id/editar?tab=checklists&…` */
  embeddedInClientEdit?: boolean;
  searchParams: {
    est?: string;
    area?: string;
    status?: string;
    page?: string;
  };
};

export async function ClientChecklistHistorySection({
  clientId,
  embeddedInClientEdit = false,
  searchParams: sp,
}: ClientChecklistHistorySectionProps) {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, kind, owner_user_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    return null;
  }

  const dossierEmailDeliveryConfigured = isDossierEmailDeliveryConfigured();

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const estFilter = sp.est ?? null;
  const areaFilter = sp.area ?? null;
  const statusFilter =
    sp.status === "aprovado" || sp.status === "em_andamento"
      ? sp.status
      : null;

  const { rows, total } = await loadChecklistSessionsForClient({
    clientId,
    establishmentId: estFilter,
    areaId: areaFilter,
    status: statusFilter,
    limit: PAGE_SIZE,
    offset,
  });

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

  const { data: estRows } = await supabase
    .from("establishments")
    .select("id, name")
    .eq("client_id", clientId)
    .order("name");

  // Carrega áreas do estabelecimento filtrado (para o seletor de área)
  const { data: areaRows } = estFilter
    ? await supabase
        .from("establishment_areas")
        .select("id, name")
        .eq("establishment_id", estFilter)
        .order("position")
    : { data: [] };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const basePath = embeddedInClientEdit
    ? `/clientes/${clientId}/editar`
    : `/clientes/${clientId}/checklists`;

  function buildHref(params: Record<string, string | null>) {
    const base: Record<string, string> = {};
    if (embeddedInClientEdit) base.tab = "checklists";
    if (estFilter) base.est = estFilter;
    if (areaFilter) base.area = areaFilter;
    if (statusFilter) base.status = statusFilter;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== null && v !== "") as [
          string,
          string,
        ][],
      ),
    ).toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  const filtersBaseHref = embeddedInClientEdit
    ? `${basePath}?tab=checklists`
    : basePath;

  return (
    <div className="space-y-6">
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

      <ChecklistHistoryFilters
        establishments={estRows ?? []}
        areas={areaRows ?? []}
        currentEst={estFilter}
        currentArea={areaFilter}
        currentStatus={statusFilter}
        baseHref={filtersBaseHref}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">
            {estFilter || areaFilter || statusFilter
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
            <ChecklistSessionHistoryCard
              key={session.id}
              session={session}
              dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
