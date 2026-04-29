import Link from "next/link";

import { WorkspaceTemplatesList } from "@/components/checklists/workspace-templates-list";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadWorkspaceTemplatesForCatalog } from "@/lib/actions/checklist-workspace";
import { cn } from "@/lib/utils";

export default async function ChecklistsEquipePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const savedId = typeof sp.saved === "string" ? sp.saved : null;
  const { rows } = await loadWorkspaceTemplatesForCatalog();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Modelos da equipe
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Checklists 100% customizáveis criados pela equipe. Reutilize em
            qualquer estabelecimento, edite a qualquer momento e arquive sem
            perder o histórico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/checklists"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Voltar ao catálogo
          </Link>
          <Link
            href="/checklists/novo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + Criar checklist personalizado
          </Link>
        </div>
      </div>

      {savedId ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Modelo salvo com sucesso.
        </p>
      ) : null}

      <WorkspaceTemplatesList templates={rows} highlightId={savedId} />
    </div>
  );
}
