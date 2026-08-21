import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PacientesListSection } from "@/components/pacientes/pacientes-list-section";
import { PacientesListSkeleton } from "@/components/pacientes/pacientes-list-skeleton";
import { PacientesSearchPanel } from "@/components/pacientes/pacientes-search-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import { parseAgeCategory } from "@/lib/pacientes/age-category";
import { buildCurrentUrl, withReturnTo } from "@/lib/navigation/return-to";
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
  const categoria = parseAgeCategory(
    typeof sp.categoria === "string" ? sp.categoria : undefined,
  );
  const novoHref = withReturnTo(
    "/pacientes/novo",
    buildCurrentUrl("/pacientes", sp),
  );
  const suspenseKey = `${q}|${situacao}|${categoria}`;

  return (
    <PageLayout>
      <PageHeader
        title="Pacientes"
        description="Registo de pacientes — pessoas físicas."
        actions={
          <Link href={novoHref} prefetch className={cn(buttonVariants())}>
            Novo paciente
          </Link>
        }
      />

      <PacientesSearchPanel
        key={suspenseKey}
        defaultQ={q}
        defaultSituacao={situacao}
        defaultCategoria={categoria}
      >
        <Suspense key={suspenseKey} fallback={<PacientesListSkeleton />}>
          <PacientesListSection searchParams={sp} />
        </Suspense>
      </PacientesSearchPanel>
    </PageLayout>
  );
}
