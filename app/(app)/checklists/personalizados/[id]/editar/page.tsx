import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomChecklistEditor } from "@/components/checklists/custom-checklist-editor";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadCustomTemplateEditData } from "@/lib/actions/checklist-custom";
import { cn } from "@/lib/utils";

export default async function EditarCustomChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await loadCustomTemplateEditData(id);
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
            Adicione secções ou itens extra. Os itens copiados do catálogo mantêm o
            texto original; apenas os marcados como extra são criados por si.
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
        </div>
      </div>

      <CustomChecklistEditor
        customTemplateId={id}
        templateName={bundle.name}
        sections={bundle.sections}
      />
    </div>
  );
}
