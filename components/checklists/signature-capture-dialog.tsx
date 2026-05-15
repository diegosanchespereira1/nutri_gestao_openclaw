"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ── Tipos ────────────────────────────────────────────────────────────── */

export type SignaturePair = {
  professional: string; // data URL PNG
  client: string;       // data URL PNG
};

type Step = "professional" | "client";

interface SignatureCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado quando ambas as assinaturas são confirmadas */
  onConfirm: (signatures: SignaturePair) => void;
  /** Nome da profissional (exibido como rótulo) */
  professionalName?: string;
}

/* ── Utilitário de canvas ────────────────────────────────────────────── */

function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Se todos os pixels alpha === 0 → canvas vazio
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

/* ── Componente interno: painel de assinatura ────────────────────────── */

interface SignaturePadProps {
  onDataUrl: (url: string | null) => void;
}

function SignaturePad({ onDataUrl }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  /* Ajusta resolução para telas HiDPI */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1e293b"; // slate-900
  }, []);

  const getPoint = (
    e: React.MouseEvent | React.TouchEvent | React.PointerEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  const startDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawing.current = true;
      lastPoint.current = getPoint(e, canvas);
      canvas.setPointerCapture(e.pointerId);
    },
    [],
  );

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getPoint(e, canvas);
    const prev = lastPoint.current ?? point;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPoint.current = point;

    if (isCanvasEmpty(canvas)) {
      setIsEmpty(true);
      onDataUrl(null);
    } else {
      setIsEmpty(false);
      onDataUrl(canvas.toDataURL("image/png"));
    }
  }, [onDataUrl]);

  const stopDrawing = useCallback(() => {
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isCanvasEmpty(canvas)) {
      onDataUrl(canvas.toDataURL("image/png"));
    }
  }, [onDataUrl]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setIsEmpty(true);
    onDataUrl(null);
  }, [onDataUrl]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-40 rounded-lg border-2 cursor-crosshair touch-none",
            "bg-white",
            isEmpty
              ? "border-border border-dashed"
              : "border-primary/40",
          )}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{ display: "block" }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground flex items-center gap-2 text-sm select-none">
              <Pen className="h-4 w-4" />
              Assine aqui com o mouse, toque ou caneta
            </span>
          </div>
        )}
      </div>

      {!isEmpty && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          className="text-muted-foreground h-8 text-xs"
        >
          <Eraser className="mr-1.5 h-3.5 w-3.5" />
          Limpar assinatura
        </Button>
      )}
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────── */

export function SignatureCaptureDialog({
  open,
  onOpenChange,
  onConfirm,
  professionalName,
}: SignatureCaptureDialogProps) {
  const [step, setStep] = useState<Step>("professional");
  const [professionalDataUrl, setProfessionalDataUrl] = useState<string | null>(null);
  const [clientDataUrl, setClientDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Reset ao fechar/reabrir */
  useEffect(() => {
    if (!open) {
      setStep("professional");
      setProfessionalDataUrl(null);
      setClientDataUrl(null);
      setError(null);
    }
  }, [open]);

  const handleNextOrConfirm = () => {
    setError(null);

    if (step === "professional") {
      if (!professionalDataUrl) {
        setError("Por favor, adicione a assinatura antes de continuar.");
        return;
      }
      setStep("client");
      return;
    }

    // step === "client"
    if (!clientDataUrl) {
      setError("Por favor, adicione a assinatura do cliente antes de confirmar.");
      return;
    }

    onConfirm({
      professional: professionalDataUrl!,
      client: clientDataUrl,
    });
  };

  const handleBack = () => {
    setError(null);
    setStep("professional");
    setClientDataUrl(null);
  };

  const isProfessional = step === "professional";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isProfessional ? "Assinatura da profissional" : "Assinatura do cliente"}
          </DialogTitle>
          <DialogDescription>
            {isProfessional
              ? `${professionalName ? `${professionalName} — ` : ""}Responsável técnica pela avaliação.`
              : "Responsável pelo estabelecimento avaliado."}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de etapa */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              isProfessional
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            1
          </span>
          <span className={isProfessional ? "text-foreground font-medium" : ""}>
            Profissional
          </span>
          <div className="h-px flex-1 bg-border" />
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              !isProfessional
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            2
          </span>
          <span className={!isProfessional ? "text-foreground font-medium" : ""}>
            Cliente
          </span>
        </div>

        {/* Preview da assinatura profissional quando no passo do cliente */}
        {!isProfessional && professionalDataUrl && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Assinatura da profissional ✓
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={professionalDataUrl}
              alt="Assinatura da profissional"
              className="max-h-14 w-auto opacity-70"
            />
          </div>
        )}

        {/* Canvas de assinatura — key força remontagem ao trocar de etapa */}
        <SignaturePad
          key={step}
          onDataUrl={isProfessional ? setProfessionalDataUrl : setClientDataUrl}
        />

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={isProfessional ? () => onOpenChange(false) : handleBack}
          >
            {isProfessional ? "Cancelar" : "← Voltar"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleNextOrConfirm}
          >
            {isProfessional ? "Próximo →" : "Confirmar e aprovar dossiê"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
