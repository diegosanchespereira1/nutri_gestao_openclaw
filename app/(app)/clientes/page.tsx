import Link from "next/link";
import { Suspense } from "react";

import { ClientesFilters } from "@/components/clientes/clientes-filters";
import { ClientesTableSection } from "@/components/clientes/clientes-table-section";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { isClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type { ClientBusinessSegment } from "@/lib/types/clients";
import { cn } from "@/lib/utils";

function parseSegmentos(
  raw: string | string[] | undefined,
): ClientBusinessSegment[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.filter((v) => isClientBusinessSegment(v)) as ClientBusinessSegment[];
}

function ClientesTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Carregando clientes"
    >
      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const createdOk = sp.ok === "created";
  const situacaoRaw =
    typeof sp.situacao === "string" ? sp.situacao : undefined;
  const segmentos = parseSegmentos(sp.segmentos);

  return (
    <PageLayout>
      <PageHeader
        title="Clientes"
        description="Carteira de clientes — empresas, hospitais e clínicas."
        actions={
          <Link href="/clientes/novo" prefetch className={cn(buttonVariants())}>
            Novo cliente
          </Link>
        }
      />

      {createdOk ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          Cliente criado com sucesso. Apenas o administrador da conta pode
          editar os dados depois do cadastro.
        </p>
      ) : null}

      <ClientesFilters
        defaultQ={q}
        defaultSituacao={
          situacaoRaw === "ativo" ||
          situacaoRaw === "inativo" ||
          situacaoRaw === "finalizado"
            ? situacaoRaw
            : "all"
        }
        defaultSegmentos={segmentos}
      />

      <Suspense fallback={<ClientesTableSkeleton />}>
        <ClientesTableSection searchParams={sp} />
      </Suspense>
    </PageLayout>
  );
}
