import Link from "next/link";
import { FileSpreadsheet, LayoutTemplate, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  /** Permite «Nova receita» com estabelecimento ou só com cliente PJ (catálogo). */
  canCreateRecipe: boolean;
};

/**
 * Barra de ações do módulo ficha técnica — alinhada ao PageHeader (DS 2.0).
 * Secundárias (navegação) à esquerda do grupo; primária «Nova receita» destacada.
 */
export function FichaTecnicaToolbar({ canCreateRecipe }: Props) {
  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      role="toolbar"
      aria-label="Ações — ficha técnica"
    >
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label="Recursos do módulo"
      >
        <Link
          href="/ficha-tecnica/templates"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          <LayoutTemplate data-icon="inline-start" className="size-4" aria-hidden />
          Templates
        </Link>
        <Link
          href="/ficha-tecnica/materias-primas"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          <FileSpreadsheet data-icon="inline-start" className="size-4" aria-hidden />
          Matérias-primas
        </Link>
      </nav>

      <div
        className="bg-border hidden h-6 w-px shrink-0 sm:block"
        aria-hidden
      />

      <Link
        href="/ficha-tecnica/nova"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          !canCreateRecipe && "pointer-events-none opacity-50",
        )}
        aria-disabled={!canCreateRecipe}
        title={
          !canCreateRecipe
            ? "Crie um cliente PJ antes de adicionar receitas"
            : undefined
        }
      >
        <Plus data-icon="inline-start" className="size-4" aria-hidden />
        Nova receita
      </Link>
    </div>
  );
}
