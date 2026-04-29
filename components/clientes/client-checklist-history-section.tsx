import Link from "next/link";
import { CheckCircle2, Clock, ClipboardList, AlertTriangle, Star, MapPin } from "lucide-react";

import { ChecklistSessionHistoryCard } from "@/components/checklists/checklist-session-history-card";
import { ChecklistHistoryFilters } from "@/components/checklists/checklist-history-filters";
import { ChecklistValidityAlertCard } from "@/components/dashboard/checklist-validity-alert-card";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { getChecklistReopenEligibility } from "@/lib/actions/checklist-fill-reopen";
import { loadChecklistSessionsForClient } from "@/lib/actions/checklist-history";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import { isDossierEmailDeliveryConfigured } from "@/lib/dossier-email-delivery";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function getScoreStyle(pct: number) {
  if (pct >= 90)
    return {
      scoreLabel: "Excelente",
      scoreColorClasses: {
        card: "border-green-200 bg-green-50/50",
        border: "border-green-200 bg-green-50/40",
        icon: "text-green-600",
        text: "text-green-700",
      },
    };
  if (pct >= 75)
    return {
      scoreLabel: "Bom",
      scoreColorClasses: {
        card: "border-blue-200 bg-blue-50/50",
        border: "border-blue-200 bg-blue-50/40",
        icon: "text-blue-600",
        text: "text-blue-700",
      },
    };
  if (pct >= 50)
    return {
      scoreLabel: "Regular",
      scoreColorClasses: {
        card: "border-amber-200 bg-amber-50/50",
        border: "border-amber-200 bg-amber-50/40",
        icon: "text-amber-600",
        text: "text-amber-700",
      },
    };
  return {
    scoreLabel: "Crítico",
    scoreColorClasses: {
      card: "border-red-200 bg-red-50/50",
      border: "border-red-200 bg-red-50/40",
      icon: "text-red-600",
      text: "text-red-700",
    },
  };
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tz = await fetchProfileTimeZone(supabase, user?.id ?? "");
  const canReopenDossier = user
    ? (await getChecklistReopenEligibility(supabase, user.id)).canReopen
    : false;

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

  // Nota média geral (apenas aprovados com score calculado)
  const scoredApproved = allRows.filter(
    (r) => r.status === "aprovado" && r.score_percentage != null,
  );
  const avgScore =
    scoredApproved.length > 0
      ? Math.round(
          scoredApproved.reduce((acc, r) => acc + r.score_percentage!, 0) /
            scoredApproved.length,
        )
      : null;

  // Nota média por área (apenas quando há áreas distintas com score)
  const areaScoreMap = new Map<string, { name: string; scores: number[] }>();
  for (const r of allRows) {
    if (r.status !== "aprovado" || r.score_percentage == null || !r.area_id) continue;
    const key = r.area_id;
    const name = r.area_name ?? "Área sem nome";
    if (!areaScoreMap.has(key)) areaScoreMap.set(key, { name, scores: [] });
    areaScoreMap.get(key)!.scores.push(r.score_percentage);
  }
  const areaScores = Array.from(areaScoreMap.values())
    .map((a) => ({
      name: a.name,
      avg: Math.round(a.scores.reduce((s, v) => s + v, 0) / a.scores.length),
      count: a.scores.length,
    }))
    .sort((a, b) => a.avg - b.avg); // pior primeiro → mais atenção no topo

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
  const validityAlerts = await loadChecklistValidityAlerts(tz, {
    clientId,
    limit: 12,
    withinDays: 7,
  });

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
      <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Validades de checklist
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Itens vencidos ou com validade nos próximos 7 dias para este cliente.
        </p>
        {validityAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sem itens vencidos ou a vencer nos próximos 7 dias.
          </p>
        ) : (
          <ul className="mt-4 space-y-3" aria-label="Validades de checklist do cliente">
            {validityAlerts.map((alert) => (
              <li key={alert.responseId}>
                <ChecklistValidityAlertCard alert={alert} timeZone={tz} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn(
        "grid gap-3",
        avgScore !== null
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-4",
      )}>
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

        {/* Card nota média — só renderiza quando há sessões aprovadas com score */}
        {avgScore !== null && (() => {
          const { scoreColorClasses, scoreLabel } = getScoreStyle(avgScore);
          return (
            <Card className={cn("border-border shadow-xs", scoreColorClasses.card)}>
              <CardContent className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2">
                  <Star className={cn("size-4 shrink-0", scoreColorClasses.icon)} aria-hidden />
                  <span className="text-xs text-muted-foreground">Nota média</span>
                </div>
                <p className={cn("text-2xl font-bold tabular-nums", scoreColorClasses.text)}>
                  {avgScore}%
                </p>
                <p className={cn("text-xs font-medium", scoreColorClasses.text)}>
                  {scoreLabel} · {scoredApproved.length} avaliação{scoredApproved.length !== 1 ? "ões" : ""}
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Breakdown por área — só aparece quando há pelo menos 1 área com score */}
      {areaScores.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">Nota média por área</h3>
            <span className="text-xs text-muted-foreground">— áreas com pior nota aparecem primeiro</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {areaScores.map((a) => {
              const { scoreColorClasses, scoreLabel } = getScoreStyle(a.avg);
              return (
                <div
                  key={a.name}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5",
                    scoreColorClasses.border,
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">📍 {a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.count} avaliação{a.count !== 1 ? "ões" : ""}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className={cn("text-lg font-bold tabular-nums", scoreColorClasses.text)}>
                      {a.avg}%
                    </p>
                    <p className={cn("text-xs font-medium", scoreColorClasses.text)}>
                      {scoreLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              canReopenDossier={canReopenDossier}
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
