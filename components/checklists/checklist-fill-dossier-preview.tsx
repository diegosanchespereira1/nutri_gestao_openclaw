"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ChecklistFillDossierItemBody } from "@/components/checklists/checklist-fill-dossier-item-body";
import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";
import { formatDocumentHashLines } from "@/lib/checklists/document-hash";
import { cn } from "@/lib/utils";
import type { FillItemResponseState, FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import type { ChecklistFillSessionReopenEventRow } from "@/lib/types/checklist-reopen";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

const defaultEmptyItem = (): FillItemResponseState => ({
  outcome: null,
  note: null,
  annotation: null,
  validUntil: null,
});

function calcDossierScore(
  template: ChecklistTemplateWithSections,
  responses: FillResponsesMap,
): { percentage: number; earned: number; total: number } | null {
  let earned = 0;
  let total = 0;
  for (const sec of template.sections) {
    for (const item of sec.items) {
      if (isStructureOnlyItem(item)) continue;
      const r = responses[item.id];
      if (!r?.outcome || r.outcome === "na") continue;
      const w = item.peso ?? 1;
      total += w;
      if (r.outcome === "conforme") earned += w;
    }
  }
  if (total === 0) return null;
  return { percentage: Math.round((earned / total) * 100), earned, total };
}

function scoreLabel(pct: number): { text: string; colorClass: string } {
  if (pct >= 90) return { text: "Excelente", colorClass: "bg-green-100 text-green-800 ring-green-500/20" };
  if (pct >= 75) return { text: "Bom", colorClass: "bg-blue-100 text-blue-800 ring-blue-500/20" };
  if (pct >= 50) return { text: "Regular", colorClass: "bg-amber-100 text-amber-800 ring-amber-500/20" };
  return { text: "Crítico", colorClass: "bg-red-100 text-red-800 ring-red-500/20" };
}

type Props = {
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  reviewEditable?: boolean;
  sessionId?: string;
  itemResponseSource?: "global" | "custom" | "workspace";
  onPatchResponse?: (
    itemId: string,
    patch: Partial<Pick<FillItemResponseState, "note" | "annotation" | "validUntil">>,
  ) => void;
  dossierApprovedAt?: string | null;
  /** Sobrepõe o título (ex. pré-visualização em modal). */
  heading?: string;
  /** Sobrepõe o texto introdutório; se omitido, usa o texto por contexto (aprovado / revisão / leitura). */
  intro?: string;
  className?: string;
  /** Assinatura da profissional (data URL PNG) — exibida após aprovação. */
  professionalSignatureDataUrl?: string | null;
  /** Assinatura do cliente (data URL PNG) — exibida após aprovação. */
  clientSignatureDataUrl?: string | null;
  /** Nome digitado pelo signatário do cliente. */
  clientSignerName?: string | null;
  /** Nome da profissional para exibição no bloco de assinaturas. */
  professionalName?: string;
  /** CRN da profissional. */
  professionalCrn?: string;
  /** Nome do estabelecimento/cliente do cadastro. */
  clientLabel?: string;
  /** Hash SHA-256 hex único desta versão aprovada do dossiê. */
  documentHash?: string | null;
  /** Eventos de reabertura anteriores — usados para exibir hashes cancelados. */
  reopenEvents?: ChecklistFillSessionReopenEventRow[];
};

/** Dossiê com seções expansíveis (FR22, UX-DR7). */
export function ChecklistFillDossierPreview({
  template,
  responses,
  itemPhotos,
  reviewEditable = false,
  sessionId,
  itemResponseSource,
  onPatchResponse,
  dossierApprovedAt = null,
  heading,
  intro,
  className,
  professionalSignatureDataUrl = null,
  clientSignatureDataUrl = null,
  clientSignerName = null,
  professionalName,
  professionalCrn,
  clientLabel,
  documentHash = null,
  reopenEvents = [],
}: Props) {
  const initialOpen = useMemo(() => {
    const m: Record<string, boolean> = {};
    template.sections.forEach((s, i) => {
      m[s.id] = i === 0;
    });
    return m;
  }, [template.sections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => initialOpen,
  );

  const score = useMemo(() => calcDossierScore(template, responses), [template, responses]);

  const defaultIntro = dossierApprovedAt
    ? "Dossiê aprovado — conteúdo em modo leitura (FR70)."
    : reviewEditable
      ? "Revise os textos abaixo; salve ao sair de cada campo. Em seguida, você pode aprovar o dossiê."
      : "Checklist, fotos e notas agregados por seção. Expanda cada bloco para revisar o detalhe.";

  return (
    <div
      className={cn(
        "border-border rounded-xl border bg-white p-4 shadow-xs",
        className,
      )}
    >
      <h3 className="text-foreground text-base font-semibold tracking-tight">
        {heading ?? "Dossiê do preenchimento"}
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">{intro ?? defaultIntro}</p>

      {score !== null && (() => {
        const { text, colorClass } = scoreLabel(score.percentage);
        return (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset",
                colorClass,
              )}
            >
              <span className="text-lg font-bold tabular-nums">{score.percentage}%</span>
              <span>{text}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {score.earned.toFixed(score.earned % 1 === 0 ? 0 : 2)} /{" "}
              {score.total.toFixed(score.total % 1 === 0 ? 0 : 2)} pontos
            </p>
          </div>
        );
      })()}

      <div className="mt-4 space-y-2">
        {template.sections.map((section) => {
          const open = openSections[section.id] ?? false;

          // Score individual desta seção
          let secEarned = 0;
          let secTotal = 0;
          for (const item of section.items) {
            if (isStructureOnlyItem(item)) continue;
            const r = responses[item.id];
            if (!r?.outcome || r.outcome === "na") continue;
            const w = item.peso ?? 1;
            secTotal += w;
            if (r.outcome === "conforme") secEarned += w;
          }
          const secScore = secTotal > 0 ? Math.round((secEarned / secTotal) * 100) : null;
          const secClass =
            secScore === null
              ? "text-muted-foreground"
              : secScore >= 90
                ? "text-green-700 bg-green-100"
                : secScore >= 75
                  ? "text-blue-700 bg-blue-100"
                  : secScore >= 50
                    ? "text-amber-700 bg-amber-100"
                    : "text-red-700 bg-red-100";

          return (
            <div
              key={section.id}
              className="border-border overflow-hidden rounded-lg border bg-white"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [section.id]: !open,
                  }))
                }
                className="text-foreground hover:bg-muted/40 flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer"
                aria-expanded={open}
              >
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">{section.title}</span>
                {secScore !== null ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      secClass,
                    )}
                  >
                    {secScore}%
                  </span>
                ) : null}
                <span className="text-muted-foreground shrink-0 text-xs font-normal">
                  {section.items.filter((it) => !isStructureOnlyItem(it)).length} itens
                </span>
              </button>
              {open ? (
                <div className="border-border border-t px-4 py-3">
                  <ChecklistFillDossierItemBody
                    section={section}
                    responses={responses}
                    itemPhotos={itemPhotos}
                    emptyItem={defaultEmptyItem}
                    reviewEditable={reviewEditable && !dossierApprovedAt}
                    sessionId={sessionId}
                    itemResponseSource={itemResponseSource}
                    onPatchResponse={onPatchResponse}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Bloco de assinaturas — no rodapé do dossiê, somente após aprovação */}
      {dossierApprovedAt && (professionalSignatureDataUrl || clientSignatureDataUrl) ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-muted/20">
          {/* Cabeçalho compacto */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Assinaturas
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              Coletado em{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(dossierApprovedAt))}
              {" · "}Documento assinado eletronicamente
            </span>
          </div>

          {/* Dois signatários lado a lado — layout compacto */}
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Profissional */}
            <div className="flex items-center gap-3 px-4 py-3">
              {professionalSignatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={professionalSignatureDataUrl}
                  alt="Assinatura da profissional"
                  className="h-10 w-auto max-w-[100px] shrink-0 object-contain opacity-90"
                />
              ) : (
                <div className="h-8 w-20 shrink-0 border-b border-dashed border-muted-foreground/40" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Profissional responsável
                </p>
                {professionalName && (
                  <p className="truncate text-xs font-semibold text-foreground">{professionalName}</p>
                )}
                {professionalCrn && (
                  <p className="text-[10px] text-muted-foreground">CRN {professionalCrn}</p>
                )}
              </div>
            </div>

            {/* Cliente / responsável */}
            <div className="flex items-center gap-3 px-4 py-3">
              {clientSignatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clientSignatureDataUrl}
                  alt="Assinatura do cliente"
                  className="h-10 w-auto max-w-[100px] shrink-0 object-contain opacity-90"
                />
              ) : (
                <div className="h-8 w-20 shrink-0 border-b border-dashed border-muted-foreground/40" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Cliente / Responsável
                </p>
                {clientSignerName && (
                  <p className="truncate text-xs font-semibold text-foreground">{clientSignerName}</p>
                )}
                {clientLabel && (
                  <p className="truncate text-[10px] text-muted-foreground">{clientLabel}</p>
                )}
              </div>
            </div>
          </div>

          {/* Hash SHA-256 do documento vigente */}
          {documentHash ? (() => {
            const [line1, line2] = formatDocumentHashLines(documentHash);
            return (
              <div className="border-t border-border px-4 py-2.5">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Identificador do documento · SHA-256
                </p>
                <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80 break-all">
                  {line1}
                </p>
                <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80 break-all">
                  {line2}
                </p>
              </div>
            );
          })() : null}

          {/* Hashes de versões anteriores canceladas por reabertura */}
          {reopenEvents.filter((ev) => ev.previous_document_hash).map((ev) => (
            <div key={ev.id} className="border-t border-border/60 bg-destructive/5 px-4 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-destructive/70">
                Versão cancelada em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(ev.created_at))}
                {" · "}{ev.reopened_by_label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60 line-through break-all">
                {ev.previous_document_hash}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70 italic">
                Motivo: {ev.justification}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
