import Link from "next/link";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientesFilters } from "@/components/clientes/clientes-filters";
import { ClientesListBadges } from "@/components/clientes/clientes-list-badges";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type {
  ClientKind,
  ClientLifecycleStatus,
  ClientRow,
} from "@/lib/types/clients";

function parseTipo(raw: string | undefined): ClientKind | "all" {
  if (raw === "pf" || raw === "pj") return raw;
  return "all";
}

function parseSituacao(
  raw: string | undefined,
): ClientLifecycleStatus | "all" {
  if (
    raw === "ativo" ||
    raw === "inativo" ||
    raw === "finalizado"
  ) {
    return raw;
  }
  return "all";
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tipoRaw = typeof sp.tipo === "string" ? sp.tipo : undefined;
  const tipo = parseTipo(tipoRaw);
  const situacaoRaw =
    typeof sp.situacao === "string" ? sp.situacao : undefined;
  const situacao = parseSituacao(situacaoRaw);
  const { rows } = await loadClientsForOwner({
    q,
    kind: tipo,
    lifecycle: situacao,
  });

  const supabase = await createClient();
  const rowsWithLogos: {
    row: ClientRow;
    logoUrl: string | null;
  }[] = await Promise.all(
    rows.map(async (row) => ({
      row,
      logoUrl:
        row.kind === "pj" && row.logo_storage_path
          ? await getClientLogoSignedUrl(supabase, row.logo_storage_path)
          : null,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Carteira de clientes pessoa física ou jurídica. Os dados são visíveis
            apenas na sua conta.
          </p>
        </div>
        <Link href="/clientes/novo" className={cn(buttonVariants())}>
          Novo cliente
        </Link>
      </div>

      <ClientesFilters
        defaultQ={q}
        defaultTipo={tipo === "all" ? "all" : tipo}
        defaultSituacao={situacao}
      />

      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {q || tipo !== "all" || situacao !== "all"
              ? "Nenhum cliente corresponde aos filtros."
              : "Ainda não tem clientes. Crie o primeiro para começar."}
          </p>
          {!q && tipo === "all" && situacao === "all" ? (
            <Link
              href="/clientes/novo"
              className={cn(buttonVariants(), "mt-4 inline-flex")}
            >
              Criar cliente
            </Link>
          ) : null}
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-white"
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
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <span className="text-foreground font-medium">
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
                    <div className="text-muted-foreground mt-2 text-sm">
                      <span>Email: {row.email}</span>
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
