import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomChecklistEditor } from "@/components/checklists/custom-checklist-editor";
import { CustomTemplateDeleteButton } from "@/components/checklists/custom-template-delete-button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  canCurrentUserDeleteCustomChecklists,
  loadCustomTemplateEditData,
} from "@/lib/actions/checklist-custom";
import { cn } from "@/lib/utils";

export default async function EditarCustomChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, canDelete] = await Promise.all([
    loadCustomTemplateEditData(id),
    canCurrentUserDeleteCustomChecklists(),
  ]);
  if (!bundle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Editar modelo personalizado
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Alterações valem só para novos preenchimentos. O histórico do cliente
            mantém a versão congelada de cada sessão.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/checklists/personalizados"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Lista de modelos
          </Link>
          <Link
            href="/checklists"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Catálogo
          </Link>
          {canDelete ? (
            <CustomTemplateDeleteButton
              customTemplateId={id}
              templateName={bundle.name}
            />
          ) : null}
        </div>
      </div>

      <CustomChecklistEditor
        customTemplateId={id}
        templateName={bundle.name}
        sections={bundle.sections}
        createdByName={bundle.created_by_name}
      />
    </div>
  );
}
