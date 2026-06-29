"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Loader2, Pencil, Play, Trash2 } from "lucide-react";

import { ArchivedTemplateBadge } from "@/components/checklists/archived-template-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveCustomTemplateAction,
  deleteCustomTemplateAction,
  loadCustomTemplatePreviewAction,
  unarchiveCustomTemplateAction,
  type CustomTemplateListRow,
} from "@/lib/actions/checklist-custom";
import { startChecklistCustomFill } from "@/lib/actions/checklist-fill";
import { cn } from "@/lib/utils";

import { ExpandableTemplateSections } from "./expandable-template-sections";

type Props = {
  rows: CustomTemplateListRow[];
  canDelete: boolean;
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

export function CustomTemplatesList({ rows, canDelete }: Props) {
  const router = useRouter();
  const [deletingRow, setDeletingRow] = useState<CustomTemplateListRow | null>(
    null,
  );
  const [archivingRow, setArchivingRow] = useState<CustomTemplateListRow | null>(
    null,
  );
  const [reactivatingRow, setReactivatingRow] = useState<CustomTemplateListRow | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deletingRow) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomTemplateAction(deletingRow.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDeletingRow(null);
      router.refresh();
    });
  }

  function confirmArchive() {
    if (!archivingRow) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveCustomTemplateAction(archivingRow.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setArchivingRow(null);
      router.refresh();
    });
  }

  function confirmReactivate() {
    if (!reactivatingRow) return;
    setError(null);
    startTransition(async () => {
      const result = await unarchiveCustomTemplateAction(reactivatingRow.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReactivatingRow(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Ainda não tem modelos personalizados. No catálogo, selecione um
          estabelecimento e use <strong>Personalizar</strong> num template.
        </p>
        <Link
          href="/checklists"
          className={cn(buttonVariants(), "mt-4 inline-flex")}
        >
          Ir ao catálogo
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Modelos personalizados">
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs",
              r.is_archived && "border-dashed bg-muted/30 opacity-90",
            )}
          >
            <div className="p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Personalizado
                  </span>
                  {r.is_archived ? <ArchivedTemplateBadge /> : null}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {r.name}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-foreground/85">
                  <p className="truncate">{r.establishment_label}</p>
                  {r.created_by_name && (
                    <p className="truncate">
                      Criado por:{" "}
                      <span className="text-foreground/95">{r.created_by_name}</span>
                    </p>
                  )}
                  <p className="truncate">
                    Última alteração em {formatDate(r.updated_at)}
                  </p>
                </div>
              </div>

              {r.is_archived ? (
                <p className="mt-3 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-2 py-1">
                  Modelo arquivado — não pode ser usado em novos preenchimentos. Reative
                  quando quiser voltar a utilizá-lo.
                </p>
              ) : r.has_been_used ? (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                  Modelo em uso — não pode ser editado. Arquive para ocultar do
                  catálogo; os preenchimentos anteriores permanecem no histórico. Pode
                  reativar depois nesta lista.
                </p>
              ) : null}
            </div>

            <ExpandableTemplateSections
              loadSections={() => loadCustomTemplatePreviewAction(r.id)}
            />

            <div className="flex flex-col gap-2 border-t border-border/50 p-4 sm:flex-row sm:flex-wrap">
              {r.is_archived ? (
                canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setReactivatingRow(r)}
                  >
                    <ArchiveRestore className="size-3.5" />
                    Reativar
                  </Button>
                ) : null
              ) : (
                <>
              <form action={startChecklistCustomFill}>
                <input type="hidden" name="custom_template_id" value={r.id} />
                <Button type="submit" size="sm" className="w-full sm:w-auto">
                  <Play className="size-3.5" />
                  Preencher
                </Button>
              </form>
              {!r.has_been_used && (
                <Link
                  href={`/checklists/personalizados/${r.id}/editar`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full sm:w-auto",
                  )}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
              )}
              {canDelete && r.has_been_used && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                  onClick={() => setArchivingRow(r)}
                >
                  <Archive className="size-3.5" />
                  Arquivar
                </Button>
              )}
              {canDelete && !r.has_been_used && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                  onClick={() => setDeletingRow(r)}
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </Button>
              )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={archivingRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchivingRow(null);
            setError(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Arquivar modelo personalizado?</DialogTitle>
            <DialogDescription>
              O modelo &quot;{archivingRow?.name}&quot; ficará marcado como arquivado e
              não poderá ser usado em novos checklists. Os preenchimentos já realizados
              continuam acessíveis no histórico de cada cliente. Pode reativá-lo depois
              na lista de modelos personalizados.
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
              onClick={() => setArchivingRow(null)}
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

      <Dialog
        open={reactivatingRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReactivatingRow(null);
            setError(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Reativar modelo personalizado?</DialogTitle>
            <DialogDescription>
              O modelo &quot;{reactivatingRow?.name}&quot; voltará a aparecer no catálogo
              e poderá ser usado em novos preenchimentos.
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
              onClick={() => setReactivatingRow(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmReactivate}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Reativando…
                </>
              ) : (
                "Reativar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRow(null);
            setError(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Remover modelo personalizado?</DialogTitle>
            <DialogDescription>
              O modelo &quot;{deletingRow?.name}&quot; será excluído
              permanentemente, incluindo secções e itens extra. Esta ação não
              pode ser desfeita.
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
              onClick={() => setDeletingRow(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Removendo…
                </>
              ) : (
                "Remover modelo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
