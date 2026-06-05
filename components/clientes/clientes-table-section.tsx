import Link from "next/link";
import { Building2 } from "lucide-react";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClickableTableRow } from "@/components/clientes/clickable-table-row";
import { ClientRowActions } from "@/components/clientes/client-row-actions";
import {
  badgeBase,
  categoryBadgeContent,
  lifecycleMeta,
} from "@/components/clientes/clientes-list-badges";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { clientLifecycleBadgeLabel } from "@/lib/constants/client-lifecycle";
import { getClientLogoSignedUrls } from "@/lib/clients/logo-sync";
import { loadLatestClientChecklistScores } from "@/lib/clients/list-enrichment";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { cn } from "@/lib/utils";
import type {
  ClientBusinessSegment,
  ClientLifecycleStatus,
  ClientRow,
} from "@/lib/types/clients";
import { isClientBusinessSegment } from "@/lib/constants/client-business-segment";

function parseSituacao(
  raw: string | undefined,
): ClientLifecycleStatus | "all" {
  if (raw === "ativo" || raw === "inativo" || raw === "finalizado") {
    return raw;
  }
  return "all";
}

function parseSegmentos(
  raw: string | string[] | undefined,
): ClientBusinessSegment[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.filter((v) => isClientBusinessSegment(v)) as ClientBusinessSegment[];
}

function NotaBadge({ pct }: { pct: number }) {
  let cls = "bg-red-100 text-red-800";
  if (pct >= 90) cls = "bg-green-100 text-green-800";
  else if (pct >= 75) cls = "bg-blue-100 text-blue-800";
  else if (pct >= 50) cls = "bg-amber-100 text-amber-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        cls,
      )}
    >
      {Math.round(pct)}%
    </span>
  );
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function ClientesTableSection({ searchParams: sp }: Props) {
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacaoRaw =
    typeof sp.situacao === "string" ? sp.situacao : undefined;
  const situacao = parseSituacao(situacaoRaw);
  const segmentos = parseSegmentos(sp.segmentos);
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const [{ rows, total, pageSize }, { supabase }] = await Promise.all([
    loadClientsForOwner({
      q,
      kind: "pj",
      lifecycle: situacao,
      businessSegments: segmentos.length > 0 ? segmentos : undefined,
      page,
    }),
    getServerContext(),
  ]);

  const clientIds = rows.map((r) => r.id);
  const logoPaths = rows
    .filter((r) => r.kind === "pj" && r.logo_storage_path)
    .map((r) => r.logo_storage_path as string);

  const [logoUrlMap, clientScores] = await Promise.all([
    getClientLogoSignedUrls(supabase, logoPaths),
    loadLatestClientChecklistScores(supabase, clientIds),
  ]);

  const rowsWithLogos: { row: ClientRow; logoUrl: string | null }[] = rows.map(
    (row) => ({
      row,
      logoUrl:
        row.kind === "pj" && row.logo_storage_path
          ? (logoUrlMap.get(row.logo_storage_path) ?? null)
          : null,
    }),
  );

  const hasFilters = !!(q || situacao !== "all" || segmentos.length > 0);
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (rows.length === 0) {
    return hasFilters ? (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum cliente corresponde aos filtros.
        </p>
      </div>
    ) : (
      <EmptyState
        icon={Building2}
        title="Nenhum cliente ainda"
        description="Adicione empresas, hospitais ou clínicas. Poderá depois associar estabelecimentos e pacientes a cada cliente."
        action={
          <Link href="/clientes/novo" className={cn(buttonVariants())}>
            Criar cliente
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm md:hidden">
        <div className="divide-y divide-border">
          {rowsWithLogos.map(({ row, logoUrl }) => {
            const cat = categoryBadgeContent(row.kind, row.business_segment);
            const life = lifecycleMeta[row.lifecycle_status];
            const statusLabel = clientLifecycleBadgeLabel[row.lifecycle_status];
            const score = clientScores.get(row.id) ?? null;
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={`/clientes/${row.id}/editar`}
                  prefetch
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ClientAvatar
                    name={row.legal_name}
                    imageUrl={logoUrl}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.legal_name}
                    </p>
                    {row.kind === "pj" && row.trade_name ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {row.trade_name}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span
                        title={cat.title}
                        className={cn(
                          badgeBase(),
                          "px-1.5 py-0 text-[10px] tracking-normal",
                          cat.className,
                        )}
                      >
                        {cat.label}
                      </span>
                      <span
                        className={cn(
                          badgeBase(),
                          "px-1.5 py-0 text-[10px] tracking-normal",
                          life.className,
                        )}
                      >
                        <span className="mr-0.5" aria-hidden>
                          ●
                        </span>
                        {statusLabel}
                      </span>
                      {score != null && <NotaBadge pct={score} />}
                    </div>
                  </div>
                </Link>
                <ClientRowActions clientId={row.id} />
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {`Exibindo ${from}–${to} de ${total} cliente${total !== 1 ? "s" : ""}`}
          </p>
          {totalPages > 1 && (
            <PaginationNav
              page={page}
              total={total}
              pageSize={pageSize}
              searchParams={sp}
            />
          )}
        </div>
      </div>

      <div className="border-border hidden overflow-x-auto rounded-xl border bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
            <tr>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Nome do Cliente
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Tipo de Negócio
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Status
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Nota
              </th>
              <th className="text-foreground w-24 px-4 py-3 text-left font-bold">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsWithLogos.map(({ row, logoUrl }) => {
              const cat = categoryBadgeContent(row.kind, row.business_segment);
              const life = lifecycleMeta[row.lifecycle_status];
              const statusLabel = clientLifecycleBadgeLabel[row.lifecycle_status];
              const score = clientScores.get(row.id) ?? null;
              return (
                <ClickableTableRow
                  key={row.id}
                  href={`/clientes/${row.id}/editar`}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ClientAvatar
                        name={row.legal_name}
                        imageUrl={logoUrl}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-snug text-foreground">
                          {row.legal_name}
                        </p>
                        {row.kind === "pj" && row.trade_name ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.trade_name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      title={cat.title}
                      className={cn(
                        badgeBase(),
                        "px-1.5 py-0 text-[11px]",
                        cat.className,
                      )}
                    >
                      {cat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        badgeBase(),
                        "px-1.5 py-0 text-[11px]",
                        life.className,
                      )}
                    >
                      <span className="mr-1" aria-hidden>
                        ●
                      </span>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {score != null ? (
                      <NotaBadge pct={score} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ClientRowActions clientId={row.id} />
                  </td>
                </ClickableTableRow>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {`Exibindo ${from}–${to} de ${total} cliente${total !== 1 ? "s" : ""}`}
          </p>
          {totalPages > 1 && (
            <PaginationNav
              page={page}
              total={total}
              pageSize={pageSize}
              searchParams={sp}
            />
          )}
        </div>
      </div>
    </>
  );
}
