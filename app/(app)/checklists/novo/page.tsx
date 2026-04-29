import Link from "next/link";

import { WorkspaceChecklistBuilder } from "@/components/checklists/workspace-checklist-builder";

export default function NewWorkspaceChecklistPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Criar checklist personalizado
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Modelo 100% customizável da equipe. Defina nome, seções e itens — todos
            os membros do workspace poderão usá-lo em qualquer estabelecimento.
          </p>
        </div>
        <Link
          href="/checklists"
          className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-2 hover:underline"
        >
          Voltar ao catálogo
        </Link>
      </div>

      <WorkspaceChecklistBuilder mode="create" />
    </div>
  );
}
