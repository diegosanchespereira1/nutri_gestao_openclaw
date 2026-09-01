import { Suspense } from "react";

import { LimitUsageBadge } from "@/components/limits/limit-usage-badge";
import { NewRecordButton } from "@/components/limits/new-record-button";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PacientesListSection } from "@/components/pacientes/pacientes-list-section";
import { PacientesListSkeleton } from "@/components/pacientes/pacientes-list-skeleton";
import { PacientesSearchPanel } from "@/components/pacientes/pacientes-search-panel";
import { loadLimitUiState } from "@/lib/limits/server";
import { parseAgeCategory } from "@/lib/pacientes/age-category";
import { buildCurrentUrl, withReturnTo } from "@/lib/navigation/return-to";

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
  const limite = await loadLimitUiState("patients");

  return (
    <PageLayout>
      <PageHeader
        title="Pacientes"
        description="Registo de pacientes — pessoas físicas."
        actions={
          <div className="flex items-center gap-2">
            <LimitUsageBadge state={limite} noun="pacientes" />
            <NewRecordButton
              href={novoHref}
              label="Novo paciente"
              state={limite}
            />
          </div>
        }
      />

      <PacientesSearchPanel
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
