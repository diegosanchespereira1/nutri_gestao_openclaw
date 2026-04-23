import Link from "next/link";
import { Building2 } from "lucide-react";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientesFilters } from "@/components/clientes/clientes-filters";
import { ClientesListBadges } from "@/components/clientes/clientes-list-badges";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type {
  ClientBusinessSegment,
  ClientLifecycleStatus,
  ClientRow,
} from "@/lib/types/clients";
import {
  isClientBusinessSegment,
} from "@/lib/constants/client-business-segment";

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

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacaoRaw =
    typeof sp.situacao === "string" ? sp.situacao : undefined;
  const situacao = parseSituacao(situacaoRaw);
  const segmentosRaw = sp.segmentos;
  const segmentos = parseSegmentos(segmentosRaw);
  // Story 2.1a — Clientes = apenas Pessoa Jurídica (empresas, hospitais, clínicas).
  // Pacientes PF têm módulo próprio em /pacientes/.
  const { rows } = await loadClientsForOwner({
    q,
    kind: "pj",
    lifecycle: situacao,
    businessSegments: segmentos.length > 0 ? segmentos : undefined,
  });

  const supabase = await createClient();
  const rowsWithLogos: { row: ClientRow; logoUrl: string | null }[] =
    await Promise.all(
      rows.map(async (row) => ({
        row,
        logoUrl:
          row.kind === "pj" && row.logo_storage_path
            ? await getClientLogoSignedUrl(supabase, row.logo_storage_path)
            : null,
      })),
    );

  const hasFilters = !!(q || situacao !== "all" || segmentos.length > 0);

  return (
    <PageLayout>
      <PageHeader
        title="Clientes"
        description={`${rows.length > 0 ? `${rows.length} cliente${rows.length !== 1 ? "s" : ""}` : "Carteira de clientes"} — empresas, hospitais e clínicas.`}
        actions={
          <Link href="/clientes/novo" className={cn(buttonVariants())}>
            Novo cliente
          </Link>
        }
      />

      <ClientesFilters
        defaultQ={q}
        defaultSituacao={situacao}
        defaultSegmentos={segmentos}
      />

      {rows.length === 0 ? (
        hasFilters ? (
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
        )
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
          aria-label="Lista de clientes"
        >
          {rowsWithLogos.map(({ row, logoUrl }) => (
            <li key={row.id}>
              <Link
                href={`/clientes/${row.id}/editar`}
                className="hover:bg-muted/50 focus-visible:ring-ring flex gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ClientAvatar
                  name={row.legal_name}
                  imageUrl={logoUrl}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <span className="text-foreground font-medium leading-snug">
                        {row.legal_name}
                      </span>
                      {row.kind === "pj" && row.trade_name ? (
                        <span className="text-muted-foreground mt-0.5 block text-sm">
                          {row.trade_name}
                        </span>
                      ) : null}
                    </div>
                    <ClientesListBadges
                      kind={row.kind}
                      businessSegment={row.business_segment}
                      lifecycleStatus={row.lifecycle_status}
                    />
                  </div>
                  {row.email ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {row.email}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
