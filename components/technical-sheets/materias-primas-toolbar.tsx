import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/**
 * Ação primária do módulo matérias-primas — alinhada ao PageHeader (DS 2.0).
 * Importar / atualizar preços ficam na barra de busca (como filtros na ficha técnica).
 */
export function MateriasPrimasToolbar({
  novaHref = "/materias-primas/nova",
}: {
  novaHref?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      role="toolbar"
      aria-label="Ações — matérias-primas"
    >
      <Link
        href={novaHref}
        className={cn(buttonVariants({ variant: "default", size: "default" }))}
      >
        <Plus data-icon="inline-start" className="size-4" aria-hidden />
        Nova matéria-prima
      </Link>
    </div>
  );
}
