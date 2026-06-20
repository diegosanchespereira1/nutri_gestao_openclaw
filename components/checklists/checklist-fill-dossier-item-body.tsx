"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatChecklistOutcomeLabel } from "@/lib/checklists/dossier-outcome-label";
import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";
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
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function DossierEditableAnnotation({
  itemId,
  annotation,
  onPatch,
}: {
  itemId: string;
  annotation: string;
  onPatch: (annotation: string) => void;
}) {
  const hasAnnotation = annotation.trim().length > 0;
  const [annotationOpen, setAnnotationOpen] = useState(hasAnnotation);

  useEffect(() => {
    if (hasAnnotation) setAnnotationOpen(true);
  }, [hasAnnotation]);

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-muted/15">
      <button
        type="button"
        onClick={() => setAnnotationOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/35"
        aria-expanded={annotationOpen}
        aria-controls={`dossier-ann-panel-${itemId}`}
      >
        <span className="text-sm font-medium text-foreground">
          Anotação{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
          {hasAnnotation && !annotationOpen ? (
            <span className="text-primary ml-1.5 text-xs font-normal">· com texto</span>
          ) : null}
        </span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
          {annotationOpen ? "Ocultar" : "Expandir"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              annotationOpen && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {annotationOpen ? (
        <div
          id={`dossier-ann-panel-${itemId}`}
          className="space-y-1 border-t border-border/50 px-3 pb-3 pt-2"
        >
          <Label htmlFor={`dossier-ann-${itemId}`} className="sr-only">
            Anotação (opcional)
          </Label>
          <textarea
            id={`dossier-ann-${itemId}`}
            rows={3}
            maxLength={MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}
            value={annotation}
            onChange={(e) => onPatch(e.target.value)}
            className={textareaClass}
            aria-describedby={`dossier-ann-hint-${itemId}`}
          />
          <p
            id={`dossier-ann-hint-${itemId}`}
            className="text-muted-foreground text-xs"
          >
            {annotation.length}/{MAX_CHECKLIST_ITEM_ANNOTATION_CHARS} caracteres
          </p>
        </div>
      ) : null}
    </div>
  );
}

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
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    hasLocation: boolean;
  } | null>(null);

  const canEdit =
    reviewEditable &&
    Boolean(sessionId && itemResponseSource && onPatchResponse);

  return (
    <>
      <ul className="space-y-3">
      {section.items.map((item) => {
        if (isStructureOnlyItem(item)) {
          return (
            <li key={item.id} className="list-none">
              <h4 className="text-foreground border-border/70 mt-4 border-b pb-1 text-sm font-semibold tracking-tight first:mt-0">
                {item.description}
              </h4>
            </li>
          );
        }
        const r = responses[item.id] ?? emptyItem();
        const photos = itemPhotos[item.id] ?? [];
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
                      value={r.note ?? ""}
                      onChange={(e) =>
                        onPatchResponse?.(item.id, { note: e.target.value })
                      }
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
              canEdit ? (
                <DossierEditableAnnotation
                  itemId={item.id}
                  annotation={r.annotation ?? ""}
                  onPatch={(annotation) =>
                    onPatchResponse?.(item.id, { annotation })
                  }
                />
              ) : (
                <div className="mt-2">
                  <p className="text-muted-foreground text-xs font-medium">Anotação</p>
                  <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                    {(r.annotation ?? "").trim()}
                  </p>
                </div>
              )
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        id={`dossier-valid-until-${item.id}`}
                        type="date"
                        value={r.validUntil ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          onPatchResponse?.(item.id, {
                            validUntil: v === "" ? null : e.target.value,
                          });
                        }}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 min-w-[10rem] flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {(r.validUntil ?? "").trim() ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => {
                            onPatchResponse?.(item.id, { validUntil: null });
                          }}
                        >
                          <X className="size-4" aria-hidden />
                          Limpar data
                        </Button>
                      ) : null}
                    </div>
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
