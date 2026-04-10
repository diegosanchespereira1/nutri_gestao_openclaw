"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  deleteTechnicalRecipeAction,
  toggleTemplateStatusAction,
} from "@/lib/actions/technical-recipes";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type Props = { recipeId: string; isTemplate?: boolean };

export function RecipeListRowActions({ recipeId, isTemplate = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggleTemplate() {
    startTransition(async () => {
      const result = await toggleTemplateStatusAction(recipeId, !isTemplate);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (
      !window.confirm(
        "Eliminar esta receita e todas as linhas de ingredientes? Esta ação não pode ser anulada.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTechnicalRecipeAction(recipeId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/ficha-tecnica/${recipeId}/editar`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Editar
      </Link>
      <Link
        href={`/ficha-tecnica/${recipeId}/pdf`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        target="_blank"
        rel="noopener noreferrer"
      >
        PDF
      </Link>
      <Button
        type="button"
        variant={isTemplate ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={onToggleTemplate}
        title={isTemplate ? "Remover de templates" : "Marcar como template"}
        aria-label={
          isTemplate ? "Remover de templates" : "Marcar como template"
        }
      >
        <Star className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={pending}
        onClick={onDelete}
      >
        {pending ? "A eliminar…" : "Eliminar"}
      </Button>
    </div>
  );
}
