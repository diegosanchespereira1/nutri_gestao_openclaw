import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { withReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

type Props = {
  /** Página atual — o link correspondente fica oculto para evitar redundância. */
  current?: "catalog" | "equipe" | "personalizados";
  className?: string;
  returnToOrigin?: string;
};

export function ChecklistModelsNav({
  current = "catalog",
  className,
  returnToOrigin,
}: Props) {
  const href = (path: string) =>
    returnToOrigin ? withReturnTo(path, returnToOrigin) : path;

  return (
    <nav
      aria-label="Navegação de modelos de checklist"
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap", className)}
    >
      {current !== "catalog" ? (
        <Link
          href={href("/checklists")}
          prefetch
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          Catálogo
        </Link>
      ) : null}
      {current !== "equipe" ? (
        <Link
          href={href("/checklists/equipe")}
          prefetch
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          Modelos da equipe
        </Link>
      ) : null}
      {current !== "personalizados" ? (
        <Link
          href={href("/checklists/personalizados")}
          prefetch
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          Modelos personalizados
        </Link>
      ) : null}
    </nav>
  );
}
