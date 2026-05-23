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
                "min-w-0 rounded-xl border bg-card p-4 shadow-xs transition-colors",
                highlighted ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}
            >
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Equipe
                </span>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {tpl.name}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-foreground/85">
                  <p className="truncate">
                    Criado por:{" "}
                    <span className="text-foreground/95">
                      {tpl.created_by_name ?? "Equipe"}
                    </span>
                  </p>
                  <p className="truncate">Última alteração em {formatDate(tpl.updated_at)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-2.5 py-1.5">
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

              {tpl.has_been_used && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                  Modelo em uso — não pode ser editado. Use-o como base para criar um novo.
                </p>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/checklists?workspace_template=${tpl.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
                >
                  <Play className="size-3.5" />
                  Preencher
                </Link>
                {!tpl.has_been_used && (
                  <Link
                    href={`/checklists/equipe/${tpl.id}/editar`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
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
