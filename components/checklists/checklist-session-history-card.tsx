"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
};

export function ChecklistSessionHistoryCard({ session }: Props) {
  const [ncItems, setNcItems] = useState<NcItemDetail[] | null>(null);
  const [ncOpen, setNcOpen] = useState(false);
  const [loadingNc, setLoadingNc] = useState(false);

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
              <p className="text-sm font-semibold text-foreground leading-snug">
                {session.template_name}
              </p>
              <StatusBadge status={session.status} />
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
            <Link
              href={`/checklists/preencher/${session.id}`}
              target="_blank"
              rel="noopener"
              className={cn(buttonVariants({ size: "sm" }), "h-7 gap-1 px-2 text-xs")}
            >
              Continuar preenchimento
              <ExternalLink className="size-3" aria-hidden />
            </Link>
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
