"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, ZoomIn } from "lucide-react";

import { saveFillItemResponse } from "@/lib/actions/checklist-fill";
import { formatChecklistOutcomeLabel } from "@/lib/checklists/dossier-outcome-label";
import { Label } from "@/components/ui/label";
import { ImageViewerModal } from "@/components/image-viewer-modal";
import { cn } from "@/lib/utils";
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
  itemResponseSource?: "global" | "custom" | "workspace";
  onPatchResponse?: (
    itemId: string,
    patch: Partial<Pick<FillItemResponseState, "note" | "annotation" | "validUntil">>,
  ) => void;
};

/** Conteúdo completo dos itens de uma seção (compartilhado entre resumo e dossiê preview). */
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
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    hasLocation: boolean;
  } | null>(null);

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
        validUntil: r.validUntil,
      });
      setSavingItemId(null);
    },
    [emptyItem, itemResponseSource, responses, sessionId],
  );

  return (
    <>
      <ul className="space-y-3">
      {section.items.map((item) => {
        const r = responses[item.id] ?? emptyItem();
        const photos = itemPhotos[item.id] ?? [];
        const busy = savingItemId === item.id;
        const isNc = r.outcome === "nc";
        return (
          <li
            key={item.id}
            className={cn(
              "rounded-lg border p-3 text-sm",
              isNc
                ? "border-red-300 bg-red-50 border-l-4 border-l-red-500"
                : "border-border bg-background",
            )}
          >
            <div className="flex items-start gap-2">
              {isNc && (
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-red-500"
                  aria-hidden
                />
              )}
              <p className={cn("font-medium", isNc ? "text-red-900" : "text-foreground")}>
                {item.description}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Avaliação:{" "}
              <span
                className={cn(
                  "font-semibold",
                  isNc ? "text-red-700" : "text-foreground",
                )}
              >
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
                    <p className="text-red-700 text-xs font-semibold">
                      Não conformidade
                    </p>
                    <p className="text-red-900 mt-0.5 whitespace-pre-wrap">
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

            {r.outcome !== null &&
            (canEdit || (r.validUntil ?? "").trim().length > 0) ? (
              <div className="mt-2">
                {canEdit ? (
                  <>
                    <Label
                      htmlFor={`dossier-valid-until-${item.id}`}
                      className="text-muted-foreground"
                    >
                      Válido até (opcional)
                    </Label>
                    <input
                      id={`dossier-valid-until-${item.id}`}
                      type="date"
                      disabled={busy}
                      value={r.validUntil ?? ""}
                      onChange={(e) =>
                        onPatchResponse?.(item.id, { validUntil: e.target.value })
                      }
                      onBlur={() => void flushItem(item.id)}
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-2 flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs font-medium">Validade</p>
                    <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                      {formatValidUntilLabel(r.validUntil)}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {photos.length > 0 ? (
              <div className="mt-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Fotos de evidência ({photos.length})
                </p>
                <ul className="flex flex-wrap gap-3" aria-label="Fotos de evidência">
                  {photos.map((p) => (
                    <li
                      key={p.id}
                      className="border-border group relative overflow-hidden rounded-lg border bg-muted/20 cursor-pointer transition-transform hover:scale-105"
                      onClick={() =>
                        setViewingImage({ url: p.url, hasLocation: p.hasLocation })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setViewingImage({ url: p.url, hasLocation: p.hasLocation });
                        }
                      }}
                      aria-label="Clique para visualizar imagem ampliada"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada */}
                      <img
                        src={p.url}
                        alt="Foto de evidência"
                        width={120}
                        height={120}
                        className="size-32 object-cover"
                      />
                      {/* Overlay com ícone de zoom */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40 flex items-center justify-center">
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="text-white size-6" aria-hidden />
                        </div>
                      </div>
                      {p.hasLocation ? (
                        <p className="bg-background/80 text-muted-foreground px-2 py-1 text-center text-[10px]">
                          Com localização
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
      </ul>

      <ImageViewerModal
        isOpen={viewingImage !== null}
        imageUrl={viewingImage?.url ?? ""}
        hasLocation={viewingImage?.hasLocation}
        onClose={() => setViewingImage(null)}
      />
    </>
  );
}

function formatValidUntilLabel(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `Válido até: ${day}/${month}/${year}`;
}
