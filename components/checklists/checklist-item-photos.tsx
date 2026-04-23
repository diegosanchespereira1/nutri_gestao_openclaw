"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Trash2, ZoomIn } from "lucide-react";

import { PageHelpHint } from "@/components/help/page-help-hint";
import { Button } from "@/components/ui/button";
import { ImageViewerModal } from "@/components/image-viewer-modal";
import {
  deleteChecklistFillPhotoAction,
  uploadChecklistFillPhotoAction,
} from "@/lib/actions/checklist-fill-photos";
import {
  CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM,
  CHECKLIST_FILL_PHOTO_MAX_BYTES,
} from "@/lib/constants/checklist-fill-photos-storage";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import { cn } from "@/lib/utils";

function allowsFeature(feature: "geolocation"): boolean {
  if (typeof document === "undefined") return true;
  const doc = document as Document & {
    permissionsPolicy?: { allowsFeature?: (name: string) => boolean };
    featurePolicy?: { allowsFeature?: (name: string) => boolean };
  };
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  if (!policy?.allowsFeature) return true;
  try {
    return policy.allowsFeature(feature);
  } catch {
    return true;
  }
}

/** Tempo para o usuário responder ao pedido de localização (negar = segue sem coords). */
const GEOLOCATION_BROWSER_TIMEOUT_MS = 28_000;
/** Margem acima do timeout do browser para evitar Promise pendente. */
const GEOLOCATION_ENVELOPE_MS = GEOLOCATION_BROWSER_TIMEOUT_MS + 3_000;

function getPositionOptional(): Promise<GeolocationPosition | null> {
  if (
    typeof window === "undefined" ||
    !navigator.geolocation ||
    !allowsFeature("geolocation")
  ) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (pos: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(envelopeTimer);
      resolve(pos);
    };
    const envelopeTimer = window.setTimeout(
      () => finish(null),
      GEOLOCATION_ENVELOPE_MS,
    );
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos),
        () => finish(null),
        {
          enableHighAccuracy: false,
          maximumAge: 300_000,
          timeout: GEOLOCATION_BROWSER_TIMEOUT_MS,
        },
      );
    } catch {
      finish(null);
    }
  });
}

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

/**
 * Redimensiona e converte a imagem para JPEG via Canvas.
 * Resolve dois problemas de mobile:
 *  - iOS câmera envia HEIC (tipo não suportado pelo servidor)
 *  - Fotos de câmera são tipicamente 4-8MB (ultrapassa o limite de 6MB)
 */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Se já for pequeno e JPEG/PNG/WebP, pode não precisar comprimir
    // Mas comprimimos sempre para garantir compatibilidade de formato
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas não suportado"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falha ao comprimir imagem"));
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

type UploadStep = "compressing" | "location" | "uploading" | "saving";

type UploadState =
  | { status: "idle" }
  | { status: "busy"; step: UploadStep; percent: number };

const STEP_LABELS: Record<UploadStep, string> = {
  compressing: "Comprimindo imagem…",
  location:
    "Localização opcional — aguardando permissão ou seguindo sem GPS…",
  uploading: "Enviando ao servidor…",
  saving: "Salvando registro…",
};

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
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    hasLocation: boolean;
  } | null>(null);
  /** Câmera (traseira em celular/tablet — atributo HTML `capture`). */
  const inputCameraRef = useRef<HTMLInputElement>(null);
  /** Galeria / arquivos sem forçar câmera (útil em tablet ou desktop). */
  const inputGalleryRef = useRef<HTMLInputElement>(null);

  const atLimit = photos.length >= CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM;
  const busy = uploadState.status === "busy";

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

      if (file.type && !file.type.startsWith("image/")) {
        setUploadError("Selecione um arquivo de imagem válido.");
        return;
      }

      try {
        // ── Etapa 1: comprimir ──
        setUploadState({ status: "busy", step: "compressing", percent: 10 });
        const compressed = await compressImage(file);
        setUploadState({ status: "busy", step: "compressing", percent: 30 });

        if (compressed.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) {
          setUploadState({ status: "idle" });
          const maxMB = CHECKLIST_FILL_PHOTO_MAX_BYTES / 1024 / 1024;
          const fileMB = (compressed.size / 1024 / 1024).toFixed(1);
          setUploadError(
            `Imagem muito grande mesmo após compressão. Máximo: ${maxMB}MB. Tamanho: ${fileMB}MB.`,
          );
          return;
        }

        // ── Etapa 2: localização (opcional — negação ou timeout não bloqueia o upload) ──
        setUploadState({ status: "busy", step: "location", percent: 40 });
        let lat = "";
        let lng = "";
        const pos = await getPositionOptional();
        if (pos) {
          lat = String(pos.coords.latitude);
          lng = String(pos.coords.longitude);
        }
        setUploadState({ status: "busy", step: "location", percent: 50 });

        // ── Etapa 3: enviar ao servidor ──
        setUploadState({ status: "busy", step: "uploading", percent: 55 });

        const fd = new FormData();
        fd.append("session_id", sessionId);
        fd.append("item_id", itemId);
        fd.append("item_response_source", itemResponseSource);
        fd.append("file", compressed);
        if (lat) fd.append("latitude", lat);
        if (lng) fd.append("longitude", lng);

        setUploadState({ status: "busy", step: "uploading", percent: 65 });
        const res = await uploadChecklistFillPhotoAction(fd);

        if (!res.ok) {
          setUploadState({ status: "idle" });
          setUploadError(res.error);
          return;
        }

        // ── Etapa 4: finalizar ──
        setUploadState({ status: "busy", step: "saving", percent: 95 });
        const newPhotos = [...photos, res.photo];
        setPhotos(newPhotos);
        onPhotosChange?.(newPhotos);
        setUploadState({ status: "busy", step: "saving", percent: 100 });

        // Breve pausa para o usuário ver 100%
        await new Promise((r) => setTimeout(r, 400));
        setUploadState({ status: "idle" });
      } catch (err) {
        setUploadState({ status: "idle" });
        const msg = err instanceof Error ? err.message : String(err);
        setUploadError(
          msg.includes("Failed to fetch") || msg.includes("network")
            ? "Erro de rede ao enviar foto. Verifique a conexão e tente novamente."
            : msg.includes("processar") || msg.includes("ler")
              ? msg
              : `Erro ao enviar foto: ${msg}`,
        );
      }
    },
    [sessionId, itemId, itemResponseSource, photos, onPhotosChange, atLimit, disabled],
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
      const newPhotos = photos.filter((p) => p.id !== photoId);
      setPhotos(newPhotos);
      onPhotosChange?.(newPhotos);
    },
    [disabled, sessionId, photos, onPhotosChange],
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
              Em celular ou tablet, use <strong>Tirar foto</strong> para abrir a câmera;{" "}
              <strong>Galeria</strong> para escolher uma imagem já salva. Formatos JPEG,
              PNG ou WebP até 6 MB. A localização é opcional: se você negar ou demorar a
              responder, a foto é enviada mesmo assim, sem coordenadas.
            </p>
          </PageHelpHint>
        </div>
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => void onFileChange(ev)}
        />
        <input
          ref={inputGalleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => void onFileChange(ev)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {!busy ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="min-h-11 min-w-[44px] gap-1.5 sm:min-h-9"
                disabled={disabled || atLimit}
                onClick={openCamera}
                aria-label="Tirar foto com a câmera"
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
                aria-label="Escolher imagem da galeria ou arquivos"
              >
                <Images className="size-4" aria-hidden />
                Galeria
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {uploadState.status === "busy" ? (
        <div className="mt-3 space-y-1.5" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <svg className="size-3.5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {STEP_LABELS[uploadState.step]}
            </span>
            <span className="text-foreground tabular-nums font-medium">
              {uploadState.percent}%
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                uploadState.percent === 100
                  ? "bg-green-500"
                  : "bg-primary",
              )}
              style={{ width: `${uploadState.percent}%` }}
            />
          </div>
        </div>
      ) : null}

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
              Tentar câmera
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
              className="border-border relative overflow-hidden rounded-lg border bg-muted/30 group cursor-pointer transition-transform hover:scale-105"
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
              {/* eslint-disable-next-line @next/next/no-img-element -- URLs assinadas dinâmicas */}
              <img
                src={p.url}
                alt=""
                width={80}
                height={80}
                className="size-20 object-cover"
              />
              {/* Overlay com ícone de zoom */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="text-white size-5" aria-hidden />
                </div>
              </div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(p.id);
                }}
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

      <ImageViewerModal
        isOpen={viewingImage !== null}
        imageUrl={viewingImage?.url ?? ""}
        hasLocation={viewingImage?.hasLocation}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}
