"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  deleteTechnicalRecipeAction,
  toggleTemplateFavoriteAction,
  toggleTemplateStatusAction,
} from "@/lib/actions/technical-recipes";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  FileDown,
  LayoutTemplate,
  MoreVertical,
  Pencil,
  Star,
  X,
} from "lucide-react";

type Props = {
  recipeId: string;
  isTemplate?: boolean;
  clientId?: string | null;
  isTemplateFavorite?: boolean;
};

type ActionsLayout = "inline" | "menu";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setFavorite(isTemplateFavorite);
  }, [isTemplateFavorite]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function handleScroll() {
      setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuOpen]);

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.right,
      transform: "translateX(-100%)",
      zIndex: 50,
    });
  }

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    updateMenuPosition();
    setMenuOpen(true);
  }

  function showFavoriteAddedNotice() {
    setNotice("Adicionado a lista de templates favoritos");
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5500);
  }

  function closeNotice() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(null);
  }

  function closeMenu() {
    setMenuOpen(false);
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

  const menuItemClassName =
    "text-foreground hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors";

  function renderActions(layout: ActionsLayout) {
    const isMenu = layout === "menu";
    const linkClass = isMenu
      ? menuItemClassName
      : cn(buttonVariants({ variant: "outline", size: "sm" }));
    const templateClass = isMenu
      ? cn(
          menuItemClassName,
          isTemplate && "bg-primary/10 text-primary font-medium",
        )
      : cn(buttonVariants({ variant: isTemplate ? "default" : "outline", size: "sm" }));
    const favoriteClass = isMenu
      ? cn(
          menuItemClassName,
          favorite && "bg-primary/10 text-primary font-medium",
        )
      : cn(buttonVariants({ variant: favorite ? "default" : "outline", size: "sm" }));
    const deleteClass = isMenu
      ? cn(menuItemClassName, "text-destructive hover:bg-destructive/10")
      : cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-destructive hover:bg-destructive/10 hover:text-destructive",
        );

    return (
      <>
        <Link
          href={`/ficha-tecnica/${recipeId}/editar`}
          className={linkClass}
          onClick={isMenu ? closeMenu : undefined}
          role={isMenu ? "menuitem" : undefined}
        >
          <Pencil className="size-3.5 shrink-0" aria-hidden />
          Editar
        </Link>
        <Link
          href={`/ficha-tecnica/${recipeId}/pdf`}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
          onClick={isMenu ? closeMenu : undefined}
          role={isMenu ? "menuitem" : undefined}
        >
          <FileDown className="size-3.5 shrink-0" aria-hidden />
          PDF
        </Link>
        <button
          type="button"
          className={templateClass}
          disabled={busy}
          onClick={() => {
            if (isMenu) closeMenu();
            onToggleTemplate();
          }}
          title={isTemplate ? "Remover de templates" : "Marcar como template"}
          aria-label={
            isTemplate ? "Remover de templates" : "Marcar como template"
          }
          aria-pressed={isTemplate}
          role={isMenu ? "menuitem" : undefined}
        >
          <LayoutTemplate
            className={cn(
              "size-3.5 shrink-0",
              isTemplate
                ? isMenu
                  ? "text-primary"
                  : "fill-primary-foreground text-primary-foreground"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          Template
        </button>
        {isTemplate && clientId ? (
          <button
            type="button"
            className={favoriteClass}
            disabled={busy}
            onClick={() => {
              if (isMenu) closeMenu();
              onToggleFavorite();
            }}
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
            role={isMenu ? "menuitem" : undefined}
          >
            <Star
              className={cn(
                "size-3.5 shrink-0",
                favorite && "fill-amber-400 text-amber-600 dark:text-amber-300",
              )}
              aria-hidden
            />
            Favorito
          </button>
        ) : null}
        <button
          type="button"
          className={deleteClass}
          disabled={busy}
          onClick={() => {
            if (isMenu) closeMenu();
            onDelete();
          }}
          role={isMenu ? "menuitem" : undefined}
        >
          {deletePending ? "A eliminar…" : "Eliminar"}
        </button>
      </>
    );
  }

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

      <div className="relative flex justify-end">
        <div
          className="hidden flex-wrap items-center justify-end gap-1.5 xl:flex"
          role="group"
          aria-label="Ações da receita"
        >
          {renderActions("inline")}
        </div>

        <div className="xl:hidden">
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={busy}
            onClick={toggleMenu}
            aria-label="Abrir menu de ações"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreVertical className="size-4" aria-hidden />
          </Button>

          {menuOpen && menuStyle
            ? createPortal(
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Ações da receita"
                  style={menuStyle}
                  className="border-border bg-popover text-popover-foreground min-w-[11rem] rounded-md border p-1 shadow-md"
                >
                  {renderActions("menu")}
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>
    </>
  );
}
