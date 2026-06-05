import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PacientesListSection } from "@/components/pacientes/pacientes-list-section";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function parseSituacao(raw: string | undefined): "independente" | "all" {
  return raw === "independente" ? "independente" : "all";
}

function PacientesListSkeleton() {
  return (
    <ul
      className="border-border overflow-hidden rounded-lg border bg-card shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Carregando pacientes"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="border-b border-border px-4 py-3 last:border-0">
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted" />
        </li>
      ))}
    </ul>
  );
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

  return (
    <PageLayout>
      <PageHeader
        title="Pacientes"
        description="Registo de pacientes — pessoas físicas."
        actions={
          <Link href="/pacientes/novo" prefetch className={cn(buttonVariants())}>
            Novo paciente
          </Link>
        }
      />

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
            prefetch
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Limpar
          </Link>
        </div>
      </form>

      <Suspense fallback={<PacientesListSkeleton />}>
        <PacientesListSection searchParams={sp} />
      </Suspense>
    </PageLayout>
  );
}
