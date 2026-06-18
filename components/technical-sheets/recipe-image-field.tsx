"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TECHNICAL_RECIPE_IMAGE_BYTES } from "@/lib/constants/technical-recipe-images-storage";
import { cn } from "@/lib/utils";

type Props = {
  defaultUrl: string | null;
  onChange: (state: { file: File | null; remove: boolean; previewUrl: string | null }) => void;
  className?: string;
};

export function RecipeImageField({ defaultUrl, onChange, className }: Props) {
  const [remove, setRemove] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayUrl = remove ? null : (previewUrl ?? defaultUrl);

  function handleFileChange(next: File | null) {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(next);
    setRemove(false);
    const nextPreview = next ? URL.createObjectURL(next) : null;
    setPreviewUrl(nextPreview);
    onChange({ file: next, remove: false, previewUrl: nextPreview });
  }

  function handleRemoveToggle(checked: boolean) {
    setRemove(checked);
    if (checked) {
      onChange({ file: null, remove: true, previewUrl: null });
    } else {
      onChange({ file, remove: false, previewUrl: previewUrl ?? defaultUrl });
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label htmlFor="recipe-image">Imagem da receita</Label>
        <p className="text-muted-foreground text-xs">
          Foto do prato ou da preparação. PNG, JPEG ou WebP até{" "}
          {MAX_TECHNICAL_RECIPE_IMAGE_BYTES / 1024 / 1024} MB.
        </p>
      </div>

      {displayUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="border-border bg-muted/30 relative overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Imagem da receita"
              className="max-h-48 w-full max-w-xs object-cover sm:w-48"
            />
          </div>
          <div className="space-y-2">
            {defaultUrl && !file ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="border-input size-4 accent-primary"
                  checked={remove}
                  onChange={(e) => handleRemoveToggle(e.target.checked)}
                />
                Remover imagem atual
              </label>
            ) : null}
            <Input
              id="recipe-image"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
              className="border-input bg-transparent text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                handleFileChange(next);
              }}
            />
          </div>
        </div>
      ) : (
        <label
          htmlFor="recipe-image"
          className="border-border bg-muted/20 hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 transition-colors"
        >
          <ImageIcon className="text-muted-foreground size-8" aria-hidden />
          <span className="text-muted-foreground text-sm">
            Clique para enviar uma imagem
          </span>
          <Input
            id="recipe-image"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              handleFileChange(next);
            }}
          />
        </label>
      )}
    </div>
  );
}
