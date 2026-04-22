"use client";

import { X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  imageUrl: string;
  altText?: string;
  hasLocation?: boolean;
  onClose: () => void;
};

export function ImageViewerModal({
  isOpen,
  imageUrl,
  altText = "Imagem ampliada",
  hasLocation = false,
  onClose,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl border-0 bg-black/95 p-0">
        <DialogTitle className="sr-only">Visualizar imagem ampliada</DialogTitle>
        
        {/* Header com fechar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3">
          <h2 className="text-white text-lg font-semibold">Visualizar imagem</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>

        {/* Container da imagem */}
        <div className="flex items-center justify-center bg-black p-4 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- URLs assinadas dinâmicas */}
          <img
            src={imageUrl}
            alt={altText}
            className="max-h-[70vh] max-w-full object-contain"
          />
        </div>

        {/* Footer com informações */}
        {hasLocation && (
          <div className="border-t border-white/10 bg-black/50 px-4 py-3">
            <p className="text-white/70 text-sm">
              <span className="font-medium">📍 Localização capturada:</span> Esta foto foi tirada
              com informações de localização
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
