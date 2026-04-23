"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ChecklistFillDossierPdfCard } from "@/components/checklists/checklist-fill-dossier-pdf-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { deleteChecklistFillSessionAction } from "@/lib/actions/checklist-fill";
import {
  loadChecklistSessionNcItems,
  type ChecklistSessionSummary,
  type NcItemDetail,
} from "@/lib/actions/checklist-history";
import { cn } from "@/lib/utils";

/* ─── helpers ────────────────────────────────────────────────────────────── */

function formatDateTimeBR(iso: string): string {
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

/* ─── componente principal ───────────────────────────────────────────────── */

type Props = {
  session: ChecklistSessionSummary;
  dossierEmailDeliveryConfigured?: boolean;
};

export function ChecklistSessionHistoryCard({
  session,
  dossierEmailDeliveryConfigured = false,
}: Props) {
  const router = useRouter();
  const [ncItems, setNcItems] = useState<NcItemDetail[] | null>(null);
  const [ncOpen, setNcOpen] = useState(false);
  const [loadingNc, setLoadingNc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const totalSafe = session.total_items > 0 ? session.total_items : 1;
  const conformantPct = (session.conformant_count / totalSafe) * 100;
  const ncPct = (session.nc_count / totalSafe) * 100;

  async function handleToggleNc() {
    if (session.nc_count === 0) return;

    if (ncItems !== null) {
      setNcOpen((prev) => !prev);
      return;
    }

    // Lazy load
    setLoadingNc(true);
    try {
      const items = await loadChecklistSessionNcItems(session.id);
      setNcItems(items);
      setNcOpen(true);
    } finally {
      setLoadingNc(false);
    }
  }

  return (
    <Card className="border-border shadow-xs overflow-hidden">
      <CardContent className="p-0">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-2 p-4 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                #{session.seq_number}
              </span>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {session.template_name}
              </p>
              <StatusBadge status={session.status} />
              {session.area_name ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  📍 {session.area_name}
                </span>
              ) : null}
              {session.status === "aprovado" && session.score_percentage != null ? (
                <ScoreBadge pct={session.score_percentage} />
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session.establishment_name}
              {" · "}
              Iniciado por {session.started_by_label}
              {" · "}
              Última alteração em {formatDateTimeBR(session.updated_at)}
              {session.portaria_ref ? ` · ${session.portaria_ref}` : ""}
            </p>
          </div>
        </div>

        {/* ── Barra de progresso ── */}
        {session.total_items > 0 && (
          <div className="px-4 pb-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {conformantPct > 0 && (
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${conformantPct}%` }}
                  aria-hidden
                />
              )}
              {ncPct > 0 && (
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${ncPct}%` }}
                  aria-hidden
                />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-green-600">{session.conformant_count}</span> conforme
              </span>
              <span>
                <span className="font-medium text-red-600">{session.nc_count}</span> NC
              </span>
              {session.na_count > 0 && (
                <span>
                  <span className="font-medium">{session.na_count}</span> NA
                </span>
              )}
              {session.pending_count > 0 && (
                <span>
                  <span className="font-medium text-amber-600">{session.pending_count}</span> pendente
                  {session.pending_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Rodapé: ações ── */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-2.5">
          <Link
            href={`/checklists/preencher/${session.id}?view=dossie`}
            target="_blank"
            rel="noopener"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 gap-1 px-2 text-xs",
            )}
          >
            Ver dossiê
            <ExternalLink className="size-3" aria-hidden />
          </Link>
          {session.status === "em_andamento" ? (
            <>
              <Link
                href={`/checklists/preencher/${session.id}`}
                target="_blank"
                rel="noopener"
                className={cn(buttonVariants({ size: "sm" }), "h-7 gap-1 px-2 text-xs")}
              >
                Continuar preenchimento
                <ExternalLink className="size-3" aria-hidden />
              </Link>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                      aria-label="Excluir rascunho"
                      disabled={deleting}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      {deleting ? "Excluindo…" : "Excluir"}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir rascunho de checklist?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todas as respostas, anotações e fotos deste preenchimento serão
                      permanentemente removidas. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <p className="text-destructive text-sm" role="alert">
                      {deleteError}
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium"
                      onClick={async (e) => {
                        e.preventDefault();
                        setDeleting(true);
                        setDeleteError(null);
                        const res = await deleteChecklistFillSessionAction(session.id);
                        if (!res.ok) {
                          setDeleteError(res.error);
                          setDeleting(false);
                          return;
                        }
                        toast.success("Checklist excluído com sucesso.");
                        router.refresh();
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}

          {session.nc_count > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleToggleNc}
              disabled={loadingNc}
            >
              {loadingNc ? (
                "Carregando…"
              ) : ncOpen ? (
                <>
                  Ocultar NCs
                  <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  Ver NCs ({session.nc_count})
                  <ChevronDown className="size-3.5" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* ── PDF Card para dossiés aprovados ── */}
        {session.status === "aprovado" && session.dossier_approved_at ? (
          <div className="border-t border-border/50 px-4 py-3">
            <ChecklistFillDossierPdfCard
              sessionId={session.id}
              dossierApprovedAt={session.dossier_approved_at}
              initialJob={session.latestPdfExport ?? null}
              dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
            />
          </div>
        ) : null}

        {/* ── Seção lazy de itens NC ── */}
        {ncOpen && ncItems && ncItems.length > 0 && (
          <div className="border-t border-border/50 bg-muted/20 px-4 py-3 space-y-3">
            {ncItems.map((nc) => (
              <NcItemCard key={nc.item_id} nc={nc} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── sub-componentes ────────────────────────────────────────────────────── */

function ScoreBadge({ pct }: { pct: number }) {
  let colorClass = "bg-red-100 text-red-800";
  let label = "Crítico";
  if (pct >= 90) { colorClass = "bg-green-100 text-green-800"; label = "Excelente"; }
  else if (pct >= 75) { colorClass = "bg-blue-100 text-blue-800"; label = "Bom"; }
  else if (pct >= 50) { colorClass = "bg-amber-100 text-amber-800"; label = "Regular"; }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border-0 px-1.5 py-0 text-[10px] font-semibold tabular-nums", colorClass)}>
      {Math.round(pct)}% · {label}
    </span>
  );
}

function StatusBadge({ status }: { status: "em_andamento" | "aprovado" }) {
  if (status === "aprovado") {
    return (
      <Badge className="bg-green-100 text-green-800 border-0 text-[10px] px-1.5 py-0">
        Aprovado
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] px-1.5 py-0">
      Em andamento
    </Badge>
  );
}

function NcItemCard({ nc }: { nc: NcItemDetail }) {
  return (
    <div className="rounded-lg border border-red-200/60 bg-red-50/50 p-3 space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {nc.description}
          </p>
          {nc.is_required && (
            <span className="inline-block mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Obrigatório
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 pl-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Não conformidade:
          </p>
          <p className={cn("text-xs", nc.note ? "text-foreground" : "text-muted-foreground italic")}>
            {nc.note ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Plano de ação:
          </p>
          <p
            className={cn(
              "text-xs",
              nc.item_annotation
                ? "text-foreground"
                : "text-muted-foreground italic",
            )}
          >
            {nc.item_annotation ?? "Não registrado"}
          </p>
        </div>
      </div>
    </div>
  );
}
