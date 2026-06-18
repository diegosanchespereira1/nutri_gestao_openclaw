import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceChecklistBuilder } from "@/components/checklists/workspace-checklist-builder";
import {
  ensureWorkspaceTemplateDraftForPage,
  loadBaseTemplateCandidates,
  type WorkspaceEditSection,
} from "@/lib/actions/checklist-workspace";
import { WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME } from "@/lib/checklists/workspace-template-draft";

export default async function NewWorkspaceChecklistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const draftParam = typeof sp.draft === "string" ? sp.draft : undefined;
  const forceNew = sp.novo === "1";
  const baseTemplates = await loadBaseTemplateCandidates();
  const draft = await ensureWorkspaceTemplateDraftForPage(draftParam, {
    forceNew,
  });

  if (!draft) {
    redirect("/checklists?err=draft");
  }

  const initialSections: WorkspaceEditSection[] = draft.sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    items: sec.items.map((it) => ({
      id: it.id,
      description: it.description,
      is_required: it.is_required,
    })),
  }));

  const initialName =
    draft.name === WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME ? "" : draft.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Criar checklist personalizado
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Modelo 100% customizável da equipe. O rascunho é salvo no servidor
            ao adicionar seção ou item — textos em edição são gravados na
            publicação.
          </p>
        </div>
        <Link
          href="/checklists"
          className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-2 hover:underline"
        >
          Voltar ao catálogo
        </Link>
      </div>

      <WorkspaceChecklistBuilder
        mode="create"
        templateId={draft.id}
        initialName={initialName}
        initialSections={initialSections}
        baseTemplates={baseTemplates}
        isDraft
      />
    </div>
  );
}
