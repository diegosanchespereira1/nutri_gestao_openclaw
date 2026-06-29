import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  /** Página atual — o link correspondente fica oculto para evitar redundância. */
  current?: "catalog" | "equipe" | "personalizados";
  className?: string;
};

export function ChecklistModelsNav({
  current = "catalog",
  className,
}: Props) {
  return (
    <nav
      aria-label="Navegação de modelos de checklist"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {current !== "catalog" ? (
        <Link
          href="/checklists"
          prefetch
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Catálogo
        </Link>
      ) : null}
      {current !== "equipe" ? (
        <Link
          href="/checklists/equipe"
          prefetch
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Modelos da equipe
        </Link>
      ) : null}
      {current !== "personalizados" ? (
        <Link
          href="/checklists/personalizados"
          prefetch
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Modelos personalizados
        </Link>
      ) : null}
    </nav>
  );
}
