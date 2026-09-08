import Link from "next/link";

import { WorkspaceTemplatesList } from "@/components/checklists/workspace-templates-list";
import { ChecklistModelsNav } from "@/components/checklists/checklist-models-nav";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadWorkspaceTemplatesForCatalog } from "@/lib/actions/checklist-workspace";
import {
  buildCurrentUrl,
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

export default async function ChecklistsEquipePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const savedId = typeof sp.saved === "string" ? sp.saved : null;
  const { rows } = await loadWorkspaceTemplatesForCatalog();

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/checklists",
    fallbackLabel: "Checklists",
    currentPath: "/checklists/equipe",
  });
  const returnToOrigin = buildCurrentUrl("/checklists/equipe", sp);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos da equipe"
        description="Checklists 100% customizáveis criados pela equipe. Podem valer para todos os clientes ou ficar vinculados a um cliente específico."
        back={back}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <ChecklistModelsNav current="equipe" returnToOrigin={returnToOrigin} />
            <Link
              href="/checklists/novo?novo=1"
              className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
            >
              + Criar checklist personalizado
            </Link>
          </div>
        }
      />

      {savedId ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Modelo salvo com sucesso.
        </p>
      ) : null}

      <WorkspaceTemplatesList templates={rows} highlightId={savedId} />
    </div>
  );
}
