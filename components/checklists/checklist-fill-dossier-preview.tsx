"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ChecklistFillDossierItemBody } from "@/components/checklists/checklist-fill-dossier-item-body";
import { cn } from "@/lib/utils";
import type { FillItemResponseState, FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
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
  itemResponseSource?: "global" | "custom";
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
                  {section.items.length} itens
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
    </div>
  );
}
