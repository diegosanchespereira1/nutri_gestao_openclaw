"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Archive, Play } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { archiveWorkspaceTemplateAction } from "@/lib/actions/checklist-workspace";
import type { WorkspaceTemplateListRow } from "@/lib/actions/checklist-workspace";
import { cn } from "@/lib/utils";

type Props = {
  templates: WorkspaceTemplateListRow[];
  highlightId?: string | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function WorkspaceTemplatesList({ templates, highlightId = null }: Props) {
  const router = useRouter();
  const [archivingTpl, setArchivingTpl] =
    useState<WorkspaceTemplateListRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmArchive() {
    if (!archivingTpl) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveWorkspaceTemplateAction(archivingTpl.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setArchivingTpl(null);
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          Nenhum modelo de equipe ainda.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Crie um checklist 100% customizável para reutilizar em qualquer
          estabelecimento.
        </p>
        <Link
          href="/checklists/novo"
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          + Criar checklist personalizado
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((tpl) => {
          const highlighted = highlightId && highlightId === tpl.id;
          return (
            <li
              key={tpl.id}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-xs transition-colors",
                highlighted ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Equipe
                  </span>
                  <p className="mt-2 truncate text-sm font-semibold text-foreground">
                    {tpl.name}
                  </p>
                  <div className="mt-1 space-y-0.5 text-xs text-foreground/85">
                    <p>
                      Criado por:{" "}
                      <span className="text-foreground/95">
                        {tpl.created_by_name ?? "Equipe"}
                      </span>
                    </p>
                    <p>Última alteração em {formatDate(tpl.updated_at)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {tpl.required_item_count}
                      </span>{" "}
                      obrigatório{tpl.required_item_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {tpl.total_item_count}
                      </span>{" "}
                      {tpl.total_item_count === 1 ? "item" : "itens"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/checklists?workspace_template=${tpl.id}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "min-w-0 flex-1 sm:flex-none",
                  )}
                >
                  <Play className="size-3.5" />
                  Preencher
                </Link>
                <Link
                  href={`/checklists/equipe/${tpl.id}/editar`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-w-0",
                  )}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setArchivingTpl(tpl)}
                >
                  <Archive className="size-3.5" />
                  Arquivar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={archivingTpl !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchivingTpl(null);
            setError(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Arquivar modelo da equipe?</DialogTitle>
            <DialogDescription>
              O modelo &quot;{archivingTpl?.name}&quot; deixará de aparecer no
              catálogo e não poderá ser usado em novos checklists. Os
              preenchimentos já realizados continuam acessíveis no histórico de
              cada cliente.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setArchivingTpl(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={confirmArchive}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Arquivando…
                </>
              ) : (
                "Arquivar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
