"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_PATIENT_PHOTO_BYTES } from "@/lib/constants/patient-photos-storage";
import {
  convertHeicToJpegFile,
  fileLooksLikeHeic,
} from "@/lib/images/heic-client";
import { openNativeCamera, openNativeGallery } from "@/lib/mobile/camera";
import { isNativeApp } from "@/lib/mobile/platform";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type PatientPhotoFieldChange = {
  file: File | null;
  remove: boolean;
};

type Props = {
  patientName: string;
  defaultPhotoUrl?: string | null;
  onChange: (value: PatientPhotoFieldChange) => void;
  className?: string;
};

export function PatientPhotoField({
  patientName,
  defaultPhotoUrl = null,
  onChange,
  className,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhotoChecked, setRemovePhotoChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const displayPhotoUrl =
    !removePhotoChecked && (previewUrl ?? defaultPhotoUrl);
  const hasStoredPhoto = Boolean(defaultPhotoUrl);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyFile = useCallback(
    async (file: File | null) => {
      setError(null);
      if (!file) return;

      setProcessing(true);
      try {
        let nextFile = file;

        if (await fileLooksLikeHeic(file)) {
          try {
            nextFile = await convertHeicToJpegFile(file);
          } catch {
            setError(
              "Não foi possível converter HEIC. Use JPEG/PNG ou ative «Mais compatível» na câmera do iPhone.",
            );
            return;
          }
        }

        if (nextFile.size > MAX_PATIENT_PHOTO_BYTES) {
          setError(
            `A foto deve ter no máximo ${MAX_PATIENT_PHOTO_BYTES / 1024 / 1024} MB.`,
          );
          return;
        }

        setRemovePhotoChecked(false);
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return URL.createObjectURL(nextFile);
        });
        onChange({ file: nextFile, remove: false });
      } finally {
        setProcessing(false);
      }
    },
    [onChange],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    void applyFile(file);
    event.target.value = "";
  };

  const openCamera = async () => {
    setError(null);
    if (isNativeApp()) {
      try {
        const result = await openNativeCamera();
        if (result) await applyFile(result.file);
      } catch {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
      return;
    }
    cameraInputRef.current?.click();
  };

  const openGallery = async () => {
    setError(null);
    if (isNativeApp()) {
      try {
        const results = await openNativeGallery(1);
        if (results[0]) await applyFile(results[0].file);
      } catch {
        setError("Não foi possível acessar a galeria. Verifique as permissões.");
      }
      return;
    }
    galleryInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setRemovePhotoChecked(true);
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    onChange({ file: null, remove: true });
  };

  const handleUndoRemove = () => {
    setRemovePhotoChecked(false);
    onChange({ file: null, remove: false });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label>Foto do paciente</Label>
        <p className="text-muted-foreground text-xs">
          Opcional. PNG, JPEG, WebP ou HEIC (iPhone) até{" "}
          {MAX_PATIENT_PHOTO_BYTES / 1024 / 1024} MB.
        </p>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="bg-muted ring-primary/20 relative size-24 shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background">
          {displayPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPhotoUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="text-foreground flex size-full items-center justify-center text-xl font-semibold">
              {initialsFromName(patientName)}
            </span>
          )}
          {processing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" aria-hidden />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={processing}
              onClick={() => void openCamera()}
            >
              <Camera className="size-4" aria-hidden />
              Tirar foto
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={processing}
              onClick={() => void openGallery()}
            >
              <Images className="size-4" aria-hidden />
              Enviar foto
            </Button>
          </div>

          {hasStoredPhoto && !previewUrl && !removePhotoChecked ? (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs transition-colors"
            >
              <Trash2 className="size-3" aria-hidden />
              Remover foto
            </button>
          ) : removePhotoChecked && !previewUrl ? (
            <button
              type="button"
              onClick={handleUndoRemove}
              className="text-primary text-xs font-medium hover:underline"
            >
              Desfazer remoção
            </button>
          ) : null}

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
