"use client";

import { useCallback, useState } from "react";

import { saveFillItemResponse } from "@/lib/actions/checklist-fill";
import { formatChecklistOutcomeLabel } from "@/lib/checklists/dossier-outcome-label";
import { Label } from "@/components/ui/label";
import {
  MAX_CHECKLIST_ITEM_ANNOTATION_CHARS,
  type FillItemResponseState,
  type FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import type { ChecklistTemplateSectionWithItems } from "@/lib/types/checklists";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-2 flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  section: ChecklistTemplateSectionWithItems;
  responses: FillResponsesMap;
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  emptyItem: () => FillItemResponseState;
  /** Editar textos de NC e anotação no dossiê antes de aprovar (FR23). */
  reviewEditable?: boolean;
  sessionId?: string;
  itemResponseSource?: "global" | "custom";
  onPatchResponse?: (
    itemId: string,
    patch: Partial<Pick<FillItemResponseState, "note" | "annotation">>,
  ) => void;
};

/** Conteúdo completo dos itens de uma secção (partilhado entre resumo e dossiê preview). */
export function ChecklistFillDossierItemBody({
  section,
  responses,
  itemPhotos,
  emptyItem,
  reviewEditable = false,
  sessionId,
  itemResponseSource,
  onPatchResponse,
}: Props) {
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const canEdit =
    reviewEditable &&
    Boolean(sessionId && itemResponseSource && onPatchResponse);

  const flushItem = useCallback(
    async (itemId: string) => {
      if (!sessionId || !itemResponseSource) return;
      const r = responses[itemId] ?? emptyItem();
      if (!r.outcome) return;
      setSavingItemId(itemId);
      await saveFillItemResponse({
        sessionId,
        itemId,
        itemResponseSource,
        outcome: r.outcome,
        note: r.note,
        annotation: r.annotation,
      });
      setSavingItemId(null);
    },
    [emptyItem, itemResponseSource, responses, sessionId],
  );

  return (
    <ul className="space-y-3">
      {section.items.map((item) => {
        const r = responses[item.id] ?? emptyItem();
        const photos = itemPhotos[item.id] ?? [];
        const busy = savingItemId === item.id;
        return (
          <li
            key={item.id}
            className="border-border rounded-lg border bg-background/60 p-3 text-sm"
          >
            <p className="text-foreground font-medium">{item.description}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Avaliação:{" "}
              <span className="text-foreground">
                {formatChecklistOutcomeLabel(r.outcome)}
              </span>
            </p>

            {r.outcome === "nc" &&
            (canEdit || (r.note ?? "").trim().length > 0) ? (
              <div className="mt-2">
                {canEdit ? (
                  <>
                    <Label htmlFor={`dossier-nc-${item.id}`}>
                      Descrição da não conformidade
                    </Label>
                    <textarea
                      id={`dossier-nc-${item.id}`}
                      rows={3}
                      maxLength={MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}
                      disabled={busy}
                      value={r.note ?? ""}
                      onChange={(e) =>
                        onPatchResponse?.(item.id, { note: e.target.value })
                      }
                      onBlur={() => void flushItem(item.id)}
                      className={textareaClass}
                    />
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs font-medium">
                      Não conformidade
                    </p>
                    <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                      {(r.note ?? "").trim()}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {r.outcome !== null &&
            (canEdit || (r.annotation ?? "").trim().length > 0) ? (
              <div className="mt-2">
                {canEdit ? (
                  <>
                    <Label
                      htmlFor={`dossier-ann-${item.id}`}
                      className="text-muted-foreground"
                    >
                      Anotação (opcional)
                    </Label>
                    <textarea
                      id={`dossier-ann-${item.id}`}
                      rows={3}
                      maxLength={MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}
                      disabled={busy}
                      value={r.annotation ?? ""}
                      onChange={(e) =>
                        onPatchResponse?.(item.id, {
                          annotation: e.target.value,
                        })
                      }
                      onBlur={() => void flushItem(item.id)}
                      className={textareaClass}
                      aria-describedby={`dossier-ann-hint-${item.id}`}
                    />
                    <p
                      id={`dossier-ann-hint-${item.id}`}
                      className="text-muted-foreground mt-1 text-xs"
                    >
                      {(r.annotation ?? "").length}/{MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}{" "}
                      caracteres
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs font-medium">Anotação</p>
                    <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                      {(r.annotation ?? "").trim()}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {photos.length > 0 ? (
              <div className="mt-2">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Fotos ({photos.length})
                </p>
                <ul className="flex flex-wrap gap-2" aria-label="Miniaturas">
                  {photos.map((p) => (
                    <li
                      key={p.id}
                      className="border-border overflow-hidden rounded-md border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada */}
                      <img
                        src={p.url}
                        alt=""
                        width={64}
                        height={64}
                        className="size-16 object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
