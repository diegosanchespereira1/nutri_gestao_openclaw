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
});

type Props = {
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  reviewEditable?: boolean;
  sessionId?: string;
  itemResponseSource?: "global" | "custom";
  onPatchResponse?: (
    itemId: string,
    patch: Partial<Pick<FillItemResponseState, "note" | "annotation">>,
  ) => void;
  dossierApprovedAt?: string | null;
  /** Sobrepõe o título (ex. pré-visualização em modal). */
  heading?: string;
  /** Sobrepõe o texto introdutório; se omitido, usa o texto por contexto (aprovado / revisão / leitura). */
  intro?: string;
  className?: string;
};

/** Dossiê com secções colapsáveis (FR22, UX-DR7). */
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

  const defaultIntro = dossierApprovedAt
    ? "Dossiê aprovado — conteúdo em modo leitura (FR70)."
    : reviewEditable
      ? "Revise os textos abaixo; guarde ao sair de cada campo. Depois pode aprovar o dossiê."
      : "Checklist, fotos e notas agregados por secção. Expanda cada bloco para rever o detalhe.";

  return (
    <div
      className={cn(
        "border-border rounded-xl border bg-card/40 p-4 shadow-xs",
        className,
      )}
    >
      <h3 className="text-foreground text-base font-semibold tracking-tight">
        {heading ?? "Dossiê do preenchimento"}
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">{intro ?? defaultIntro}</p>

      <div className="mt-4 space-y-2">
        {template.sections.map((section) => {
          const open = openSections[section.id] ?? false;
          return (
            <div
              key={section.id}
              className="border-border overflow-hidden rounded-lg border bg-background/50"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [section.id]: !open,
                  }))
                }
                className="text-foreground hover:bg-muted/40 flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors"
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
