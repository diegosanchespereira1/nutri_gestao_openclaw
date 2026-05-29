import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkspaceChecklistBuilder } from "@/components/checklists/workspace-checklist-builder";
import { loadWorkspaceTemplateForEdit } from "@/lib/actions/checklist-workspace";
import type { WorkspaceEditSection } from "@/lib/actions/checklist-workspace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voltar para modelos da equipe
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          v{template.version}
        </Badge>
        {template.fill_session_count > 0 && (
          <Badge variant="secondary">
            {template.fill_session_count} sessão(ões) aplicada(s)
          </Badge>
        )}
      </div>

      {template.fill_session_count > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Este modelo já foi aplicado em {template.fill_session_count} sessão(ões).
            Qualquer edição criará automaticamente uma nova versão.
          </p>
        </div>
      )}

      <WorkspaceChecklistBuilder
        mode="edit"
        templateId={template.id}
        initialName={template.name}
        initialSections={initialSections}
      />
    </div>
  );
}
