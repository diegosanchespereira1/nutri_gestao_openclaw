"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Trash2 } from "lucide-react";

import { PageHelpHint } from "@/components/help/page-help-hint";
import { Button } from "@/components/ui/button";
import {
  deleteChecklistFillPhotoAction,
  uploadChecklistFillPhotoAction,
} from "@/lib/actions/checklist-fill-photos";
import {
  CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM,
} from "@/lib/constants/checklist-fill-photos-storage";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import { cn } from "@/lib/utils";

function getPositionOptional(): Promise<GeolocationPosition | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(null), 4500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(t);
        resolve(pos);
      },
      () => {
        window.clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 4000 },
    );
  });
}

type Props = {
  sessionId: string;
  itemId: string;
  itemResponseSource: "global" | "custom";
  initialPhotos: ChecklistFillPhotoView[];
  disabled?: boolean;
  /** Chamado quando a lista de fotos muda (upload ou eliminação), para resumos agregados. */
  onPhotosChange?: (photos: ChecklistFillPhotoView[]) => void;
};

export function ChecklistItemPhotos({
  sessionId,
  itemId,
  itemResponseSource,
  initialPhotos,
  disabled = false,
  onPhotosChange,
}: Props) {
  const [photos, setPhotos] = useState<ChecklistFillPhotoView[]>(initialPhotos);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Câmara (traseira em telemóvel/tablet — atributo HTML `capture`). */
  const inputCameraRef = useRef<HTMLInputElement>(null);
  /** Galeria / ficheiros sem forçar câmara (útil em tablet ou desktop). */
  const inputGalleryRef = useRef<HTMLInputElement>(null);

  const atLimit = photos.length >= CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM;

  const openCamera = useCallback(() => {
    setUploadError(null);
    inputCameraRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    setUploadError(null);
    inputGalleryRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || disabled || atLimit) return;

      setUploadError(null);
      setBusy(true);

      let lat = "";
      let lng = "";
      try {
        const pos = await getPositionOptional();
        if (pos) {
          lat = String(pos.coords.latitude);
          lng = String(pos.coords.longitude);
        }
      } catch {
        /* localização opcional */
      }

      const fd = new FormData();
      fd.append("session_id", sessionId);
      fd.append("item_id", itemId);
      fd.append("item_response_source", itemResponseSource);
      fd.append("file", file);
      if (lat) fd.append("latitude", lat);
      if (lng) fd.append("longitude", lng);

      const res = await uploadChecklistFillPhotoAction(fd);
      setBusy(false);

      if (!res.ok) {
        setUploadError(res.error);
        return;
      }

      setPhotos((prev) => {
        const next = [...prev, res.photo];
        onPhotosChange?.(next);
        return next;
      });
    },
    [atLimit, disabled, itemId, itemResponseSource, onPhotosChange, sessionId],
  );

  const onDelete = useCallback(
    async (photoId: string) => {
      if (disabled) return;
      setUploadError(null);
      setDeletingId(photoId);
      const r = await deleteChecklistFillPhotoAction({ photoId, sessionId });
      setDeletingId(null);
      if (!r.ok) {
        setUploadError(r.error);
        return;
      }
      setPhotos((prev) => {
        const next = prev.filter((p) => p.id !== photoId);
        onPhotosChange?.(next);
        return next;
      });
    },
    [disabled, onPhotosChange, sessionId],
  );

  return (
    <div className="mt-4 border-border border-t pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-foreground text-sm font-semibold sm:text-base">
            Fotos de evidência
          </p>
          <PageHelpHint ariaLabel="Como anexar fotos de evidência a este item">
            <p>
              Em telemóvel ou tablet, use <strong>Tirar foto</strong> para abrir a câmara;{" "}
              <strong>Galeria</strong> para escolher uma imagem já guardada. Formatos JPEG,
              PNG ou WebP até 6 MB. A localização é opcional se o browser permitir.
            </p>
          </PageHelpHint>
        </div>
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => void onFileChange(ev)}
        />
        <input
          ref={inputGalleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => void onFileChange(ev)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {busy ? (
            <p className="text-muted-foreground min-h-11 px-1 py-2 text-sm sm:min-h-9 sm:py-1.5">
              A enviar…
            </p>
          ) : (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="min-h-11 min-w-[44px] gap-1.5 sm:min-h-9"
                disabled={disabled || atLimit}
                onClick={openCamera}
                aria-label="Tirar foto com a câmara"
              >
                <Camera className="size-4" aria-hidden />
                Tirar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 min-w-[44px] gap-1.5 sm:min-h-9"
                disabled={disabled || atLimit}
                onClick={openGallery}
                aria-label="Escolher imagem da galeria ou ficheiros"
              >
                <Images className="size-4" aria-hidden />
                Galeria
              </Button>
            </>
          )}
        </div>
      </div>

      {uploadError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive mt-2 rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          <p>{uploadError}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={openCamera}
              disabled={disabled || busy || atLimit}
            >
              Tentar câmara
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={openGallery}
              disabled={disabled || busy || atLimit}
            >
              Tentar galeria
            </Button>
          </div>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <ul
          className="mt-3 flex flex-wrap gap-3"
          aria-label="Miniaturas de fotos deste item"
        >
          {photos.map((p) => (
            <li
              key={p.id}
              className="border-border relative overflow-hidden rounded-lg border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URLs assinadas dinâmicas */}
              <img
                src={p.url}
                alt=""
                width={80}
                height={80}
                className="size-20 object-cover"
              />
              {p.hasLocation ? (
                <span className="bg-background/90 text-muted-foreground absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center text-[10px]">
                  Com localização
                </span>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                className={cn(
                  "absolute top-1 right-1 size-8 shadow-sm",
                  deletingId === p.id && "opacity-70",
                )}
                disabled={disabled || deletingId !== null}
                aria-label="Remover foto"
                onClick={() => void onDelete(p.id)}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
          <Camera className="size-3.5 shrink-0 opacity-70" aria-hidden />
          Nenhuma foto anexada a este item.
        </p>
      )}
    </div>
  );
}
