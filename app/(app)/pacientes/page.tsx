import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

function parseSituacao(raw: string | undefined): "independente" | "all" {
  return raw === "independente" ? "independente" : "all";
}

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacao = parseSituacao(
    typeof sp.situacao === "string" ? sp.situacao : undefined,
  );

  const { rows: allRows } = await loadAllPatientsForOwner({ q });

  // Filtro "independente" (sem cliente) feito em memória após query
  const rows =
    situacao === "independente"
      ? allRows.filter((p) => !p.client_id)
      : allRows;

  const hasFilters = !!(q || situacao !== "all");

  return (
    <PageLayout>
      <PageHeader
        title="Pacientes"
        description={`${rows.length > 0 ? `${rows.length} paciente${rows.length !== 1 ? "s" : ""}` : "Registo de pacientes"} — pessoas físicas.`}
        actions={
          <Link href="/pacientes/novo" className={cn(buttonVariants())}>
            Novo paciente
          </Link>
        }
      />

      {/* Filtros */}
      <form
        action="/pacientes"
        method="get"
        className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="min-w-0 flex-1 space-y-2 lg:max-w-xs">
          <Label htmlFor="filtro-q">Pesquisar</Label>
          <Input
            id="filtro-q"
            name="q"
            type="search"
            placeholder="Nome ou CPF…"
            defaultValue={q}
            autoComplete="off"
            className="bg-white dark:bg-card"
          />
        </div>
        <div className="w-full lg:w-auto lg:min-w-[12rem] lg:max-w-xs">
          <div className="space-y-2">
            <Label htmlFor="filtro-situacao">Associação</Label>
            <select
              id="filtro-situacao"
              name="situacao"
              defaultValue={situacao}
              className="border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-card"
            >
              <option value="all">Todos</option>
              <option value="independente">Independentes (sem cliente)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Filtrar</Button>
          <Link
            href="/pacientes"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Limpar
          </Link>
        </div>
      </form>

      {/* Lista / Empty states */}
      {rows.length === 0 ? (
        hasFilters ? (
          <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum paciente corresponde aos filtros.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={HeartPulse}
            title="Nenhum paciente ainda"
            description="Adicione pacientes pessoas físicas. Pode associar a um cliente depois, se necessário."
            action={
              <Link href="/pacientes/novo" className={cn(buttonVariants())}>
                Criar paciente
              </Link>
            }
          />
        )
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
          aria-label="Lista de pacientes"
        >
          {rows.map((p) => {
            const clientCtx = p.clients?.legal_name;
            const estCtx = p.establishments?.name;
            const contextLabel = estCtx
              ? `${clientCtx} · ${estCtx}`
              : clientCtx ?? null;

            const cpfDisplay = p.document_id
              ? formatCpfDisplay(p.document_id)
              : null;
            const birthDisplay = p.birth_date
              ? String(p.birth_date).slice(0, 10)
              : null;

            return (
              <li key={p.id}>
                <Link
                  href={`/pacientes/${p.id}/editar`}
                  className="hover:bg-muted/50 focus-visible:ring-ring flex items-start gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-medium leading-snug">
                        {p.full_name}
                      </span>
                      {!p.client_id ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Independente
                        </span>
                      ) : null}
                    </div>
                    {contextLabel ? (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {contextLabel}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {birthDisplay ? `Nasc.: ${birthDisplay}` : null}
                      {cpfDisplay ? (
                        <span>
                          {birthDisplay ? " · " : ""}
                          {/* LGPD: mascarar CPF na lista */}
                          CPF: ***.***.***-{cpfDisplay.slice(-2)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}
