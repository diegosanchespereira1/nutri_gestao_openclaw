"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  deleteTechnicalRecipeAction,
  toggleTemplateFavoriteAction,
  toggleTemplateStatusAction,
} from "@/lib/actions/technical-recipes";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { FileDown, LayoutTemplate, Pencil, Star, X } from "lucide-react";

type Props = {
  recipeId: string;
  isTemplate?: boolean;
  clientId?: string | null;
  isTemplateFavorite?: boolean;
};

export function RecipeListRowActions({
  recipeId,
  isTemplate = false,
  clientId = null,
  isTemplateFavorite = false,
}: Props) {
  const router = useRouter();
  const [templatePending, setTemplatePending] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [favorite, setFavorite] = useState(isTemplateFavorite);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFavorite(isTemplateFavorite);
  }, [isTemplateFavorite]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  function showFavoriteAddedNotice() {
    setNotice("Adicionado a lista de templates favoritos");
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5500);
  }

  function closeNotice() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(null);
  }

  function onToggleTemplate() {
    if (templatePending || deletePending) return;
    setTemplatePending(true);
    void (async () => {
      try {
        const result = await toggleTemplateStatusAction(recipeId, !isTemplate);
        if (!result.ok) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      } finally {
        setTemplatePending(false);
      }
    })();
  }

  function onToggleFavorite() {
    if (!isTemplate || !clientId || favoritePending || templatePending) return;
    setFavoritePending(true);
    const prev = favorite;
    setFavorite(!prev);
    void (async () => {
      try {
        const result = await toggleTemplateFavoriteAction(recipeId);
        if (!result.ok) {
          setFavorite(prev);
          window.alert(result.error);
          return;
        }
        setFavorite(result.favorited);
        if (result.favorited) {
          showFavoriteAddedNotice();
        } else {
          setNotice(null);
        }
        router.refresh();
      } catch {
        setFavorite(prev);
        window.alert("Não foi possível atualizar o favorito.");
      } finally {
        setFavoritePending(false);
      }
    })();
  }

  function onDelete() {
    if (
      !window.confirm(
        "Eliminar esta receita e todas as linhas de ingredientes? Esta ação não pode ser anulada.",
      )
    ) {
      return;
    }
    if (deletePending) return;
    setDeletePending(true);
    void (async () => {
      try {
        const result = await deleteTechnicalRecipeAction(recipeId);
        if (!result.ok) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      } finally {
        setDeletePending(false);
      }
    })();
  }

  const busy = templatePending || favoritePending || deletePending;

  return (
    <>
      {notice ? (
        <div
          className="border-border bg-card text-foreground animate-in fade-in slide-in-from-top-2 fixed top-4 right-4 z-[200] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg duration-200 flex items-center justify-between gap-3"
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={closeNotice}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Fechar aviso"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
      <div
        className="flex flex-wrap items-center justify-end gap-1.5"
        role="group"
        aria-label="Ações da receita"
      >
        <Link
          href={`/ficha-tecnica/${recipeId}/editar`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Pencil data-icon="inline-start" className="size-3.5" aria-hidden />
          Editar
        </Link>
        <Link
          href={`/ficha-tecnica/${recipeId}/pdf`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileDown data-icon="inline-start" className="size-3.5" aria-hidden />
          PDF
        </Link>
        <Button
          type="button"
          variant={isTemplate ? "default" : "outline"}
          size="sm"
          disabled={busy}
          onClick={onToggleTemplate}
          title={isTemplate ? "Remover de templates" : "Marcar como template"}
          aria-label={
            isTemplate ? "Remover de templates" : "Marcar como template"
          }
          aria-pressed={isTemplate}
        >
          <LayoutTemplate
            data-icon="inline-start"
            className={cn(
              "size-3.5",
              isTemplate
                ? "fill-primary-foreground text-primary-foreground"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          Template
        </Button>
        {isTemplate && clientId ? (
          <Button
            type="button"
            variant={favorite ? "default" : "outline"}
            size="sm"
            disabled={busy}
            onClick={onToggleFavorite}
            title={
              favorite
                ? "Remover dos favoritos do cliente"
                : "Adicionar aos favoritos do cliente"
            }
            aria-label={
              favorite
                ? "Remover dos favoritos do cliente"
                : "Adicionar aos favoritos do cliente"
            }
            aria-pressed={favorite}
          >
            <Star
              data-icon="inline-start"
              className={cn(
                "size-3.5",
                favorite && "fill-amber-400 text-amber-600 dark:text-amber-300",
              )}
              aria-hidden
            />
            Favorito
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={onDelete}
        >
          {deletePending ? "A eliminar…" : "Eliminar"}
        </Button>
      </div>
    </>
  );
}
