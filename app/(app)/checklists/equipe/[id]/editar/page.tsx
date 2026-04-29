import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkspaceChecklistBuilder } from "@/components/checklists/workspace-checklist-builder";
import { loadWorkspaceTemplateForEdit } from "@/lib/actions/checklist-workspace";
import type { WorkspaceEditSection } from "@/lib/actions/checklist-workspace";

export default async function EditWorkspaceChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await loadWorkspaceTemplateForEdit(id);

  if (!template) {
    notFound();
  }
  if (template.archived_at) {
    notFound();
  }

  const initialSections: WorkspaceEditSection[] = template.sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    items: sec.items.map((it) => ({
      id: it.id,
      description: it.description,
      is_required: it.is_required,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Editar checklist da equipe
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Adicione ou remova itens. Itens já usados em sessões antigas são
            preservados automaticamente.
          </p>
        </div>
        <Link
          href="/checklists/equipe"
          className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-2 hover:underline"
        >
          Voltar para modelos da equipe
        </Link>
      </div>

      <WorkspaceChecklistBuilder
        mode="edit"
        templateId={template.id}
        initialName={template.name}
        initialSections={initialSections}
      />
    </div>
  );
}
