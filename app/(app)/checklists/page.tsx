import Link from "next/link";
import { Suspense } from "react";

import { ChecklistCatalogSection } from "@/components/checklists/checklist-catalog-section";
import { ChecklistModelsNav } from "@/components/checklists/checklist-models-nav";
import { ChecklistCatalogSkeleton } from "@/components/checklists/checklist-skeletons";
import { PageHelpHint } from "@/components/help/page-help-hint";
import {
  buildCurrentUrl,
} from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const focusTemplateId =
    typeof sp.template === "string" && /^[0-9a-f-]{36}$/i.test(sp.template)
      ? sp.template
      : null;
  const focusWorkspaceTemplateId =
    typeof sp.workspace_template === "string" &&
    /^[0-9a-f-]{36}$/i.test(sp.workspace_template)
      ? sp.workspace_template
      : null;
  const initialEstablishmentId =
    typeof sp.est === "string" && /^[0-9a-f-]{36}$/i.test(sp.est) ? sp.est : null;
  const returnToOrigin = buildCurrentUrl("/checklists", sp);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Checklists
            </h1>
            <PageHelpHint ariaLabel="Como funciona a página de checklists">
              <p>
                Catálogo oficial (Sistema), modelos da Equipe e personalizados por
                estabelecimento. Use um template global, duplique-o, ou crie um
                checklist 100% customizável (FR14).
              </p>
            </PageHelpHint>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <ChecklistModelsNav current="catalog" returnToOrigin={returnToOrigin} />
          <Link
            href="/checklists/novo"
            prefetch
            className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
          >
            + Criar checklist personalizado
          </Link>
        </div>
      </div>

      {err === "missing" ? (
        <p className="text-destructive text-sm" role="alert">
          Selecione um estabelecimento antes de usar um template.
        </p>
      ) : null}
      {err === "forbidden" || err === "template" || err === "session" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível iniciar o rascunho. Verifique o estabelecimento e o
          modelo e tente novamente.
        </p>
      ) : null}
      {err === "duplicate" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível criar o modelo personalizado. Tente novamente.
        </p>
      ) : null}
      {err === "draft" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível iniciar o rascunho do checklist personalizado. Tente
          novamente em instantes.
        </p>
      ) : null}

      <Suspense fallback={<ChecklistCatalogSkeleton />}>
        <ChecklistCatalogSection
          focusTemplateId={focusTemplateId}
          focusWorkspaceTemplateId={focusWorkspaceTemplateId}
          initialEstablishmentId={initialEstablishmentId}
        />
      </Suspense>
    </div>
  );
}
