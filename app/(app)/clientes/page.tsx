import Link from "next/link";
import { Suspense } from "react";

import { ClientesFilters } from "@/components/clientes/clientes-filters";
import { ClientesTableSection } from "@/components/clientes/clientes-table-section";
import { ClientesTableSkeleton } from "@/components/clientes/clientes-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { isClientBusinessSegment } from "@/lib/constants/client-business-segment";
import {
  buildCurrentUrl,
  withReturnTo,
} from "@/lib/navigation/return-to";
import type { ClientBusinessSegment } from "@/lib/types/clients";
import { cn } from "@/lib/utils";

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
  const createdOk = sp.ok === "created";
  const situacaoRaw =
    typeof sp.situacao === "string" ? sp.situacao : undefined;
  const segmentos = parseSegmentos(sp.segmentos);
  const pageKey = typeof sp.page === "string" ? sp.page : "1";
  const suspenseKey = `${q}|${situacaoRaw ?? "all"}|${segmentos.join(",")}|${pageKey}`;
  const novoHref = withReturnTo("/clientes/novo", buildCurrentUrl("/clientes", sp));

  return (
    <PageLayout>
      <PageHeader
        title="Clientes"
        description="Carteira de clientes — empresas, hospitais e clínicas."
        actions={
          <Link href={novoHref} prefetch className={cn(buttonVariants())}>
            Novo cliente
          </Link>
        }
      />

      {createdOk ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          Cliente criado com sucesso. Pode continuar a editar os dados na ficha
          do cliente.
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

      <Suspense key={suspenseKey} fallback={<ClientesTableSkeleton />}>
        <ClientesTableSection searchParams={sp} />
      </Suspense>
    </PageLayout>
  );
}
