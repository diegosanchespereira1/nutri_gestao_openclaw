import Link from "next/link";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientesFilters } from "@/components/clientes/clientes-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { formatCnpjDisplay, formatCpfDisplay } from "@/lib/format/br-document";
import { clientLifecycleLabel } from "@/lib/constants/client-lifecycle";
import type { ClientKind, ClientRow } from "@/lib/types/clients";

function parseTipo(raw: string | undefined): ClientKind | "all" {
  if (raw === "pf" || raw === "pj") return raw;
  return "all";
}

function formatDocument(row: ClientRow): string {
  if (!row.document_id) return "—";
  return row.kind === "pf"
    ? formatCpfDisplay(row.document_id)
    : formatCnpjDisplay(row.document_id);
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
  const { rows } = await loadClientsForOwner({ q, kind: tipo });

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
      />

      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {q || tipo !== "all"
              ? "Nenhum cliente corresponde aos filtros."
              : "Ainda não tem clientes. Crie o primeiro para começar."}
          </p>
          {!q && tipo === "all" ? (
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
          className="border-border divide-border divide-y overflow-hidden rounded-lg border"
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
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
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
                    <div className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-x-2 text-xs font-medium uppercase">
                      <span>{row.kind === "pf" ? "PF" : "PJ"}</span>
                      {row.kind === "pj" &&
                      row.lifecycle_status !== "ativo" ? (
                        <span className="text-foreground normal-case">
                          · {clientLifecycleLabel[row.lifecycle_status]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    <span>Documento: {formatDocument(row)}</span>
                    {row.email ? <span>Email: {row.email}</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
