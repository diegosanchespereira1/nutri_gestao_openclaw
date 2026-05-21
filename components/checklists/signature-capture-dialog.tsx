"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  professional: string;   // data URL PNG
  client: string;         // data URL PNG
  clientSignerName: string; // nome digitado pelo signatário do cliente
};

type Step = "professional" | "client";

interface SignatureCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado quando a assinatura da profissional (e do cliente, se exigida) é confirmada */
  onConfirm: (signatures: SignaturePair) => void;
  /** Nome da profissional (CRN incluso se disponível) */
  professionalName?: string;
  /** CRN da profissional */
  professionalCrn?: string;
  /** Nome do cliente/estabelecimento do cadastro */
  clientLabel?: string;
  /** Quando false, pula a etapa de assinatura do cliente. Padrão: true. */
  clientSignatureRequired?: boolean;
}

/* ── Utilitário de canvas ────────────────────────────────────────────── */

function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

/* ── Painel de assinatura ────────────────────────────────────────────── */

interface SignaturePadProps {
  onDataUrl: (url: string | null) => void;
}

function SignaturePad({ onDataUrl }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

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
    ctx.strokeStyle = "#1e293b";
  }, []);

  const getPoint = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    lastPoint.current = getPoint(e, canvas);
    canvas.setPointerCapture(e.pointerId);
  }, []);

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
    if (!isCanvasEmpty(canvas)) onDataUrl(canvas.toDataURL("image/png"));
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
    <div className="space-y-1">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-36 rounded-lg border-2 cursor-crosshair touch-none bg-white block",
            isEmpty ? "border-border border-dashed" : "border-primary/40",
          )}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
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
          className="text-muted-foreground h-7 text-xs"
        >
          <Eraser className="mr-1.5 h-3.5 w-3.5" />
          Limpar
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
  professionalCrn,
  clientLabel,
  clientSignatureRequired = true,
}: SignatureCaptureDialogProps) {
  const [step, setStep] = useState<Step>("professional");
  const [professionalDataUrl, setProfessionalDataUrl] = useState<string | null>(null);
  const [clientDataUrl, setClientDataUrl] = useState<string | null>(null);
  const [clientSignerName, setClientSignerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("professional");
      setProfessionalDataUrl(null);
      setClientDataUrl(null);
      setClientSignerName("");
      setError(null);
    }
  }, [open]);

  const handleNext = () => {
    setError(null);
    if (!professionalDataUrl) {
      setError("Por favor, assine antes de continuar.");
      return;
    }
    if (!clientSignatureRequired) {
      onConfirm({
        professional: professionalDataUrl,
        client: "",
        clientSignerName: "",
      });
      return;
    }
    setStep("client");
  };

  const handleConfirm = () => {
    setError(null);
    if (clientSignatureRequired) {
      if (!clientSignerName.trim()) {
        setError("Digite o nome de quem está assinando pelo cliente.");
        return;
      }
      if (!clientDataUrl) {
        setError("Por favor, assine antes de confirmar.");
        return;
      }
    }
    onConfirm({
      professional: professionalDataUrl!,
      client: clientDataUrl ?? "",
      clientSignerName: clientSignerName.trim(),
    });
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
              ? clientSignatureRequired
                ? "Responsável técnica pela avaliação."
                : "Responsável técnica pela avaliação. A assinatura do cliente está desativada nas configurações."
              : "Responsável pelo estabelecimento avaliado."}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de etapa */}
        {clientSignatureRequired ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              isProfessional ? "bg-primary text-primary-foreground" : "bg-muted",
            )}>1</span>
            <span className={isProfessional ? "text-foreground font-medium" : ""}>Profissional</span>
            <div className="h-px flex-1 bg-border" />
            <span className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              !isProfessional ? "bg-primary text-primary-foreground" : "bg-muted",
            )}>2</span>
            <span className={!isProfessional ? "text-foreground font-medium" : ""}>Cliente</span>
          </div>
        ) : null}

        {/* Passo 1 — Profissional */}
        {isProfessional && (
          <div className="space-y-3">
            {/* Preview de como ficará no PDF */}
            {professionalName && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Aparecerá no dossiê como:&nbsp;
                <span className="text-foreground font-semibold">{professionalName}</span>
                {professionalCrn && (
                  <span className="text-foreground"> — CRN {professionalCrn}</span>
                )}
              </div>
            )}
            <SignaturePad key="professional" onDataUrl={setProfessionalDataUrl} />
          </div>
        )}

        {/* Passo 2 — Cliente */}
        {!isProfessional && (
          <div className="space-y-3">
            {/* Preview da assinatura profissional */}
            {professionalDataUrl && (
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Profissional ✓
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={professionalDataUrl} alt="Assinatura da profissional" className="max-h-12 w-auto opacity-70" />
              </div>
            )}

            {/* Nome do signatário — campo obrigatório */}
            <div className="space-y-1.5">
              <Label htmlFor="client-signer-name" className="text-sm font-medium">
                Nome de quem está assinando
              </Label>
              <Input
                id="client-signer-name"
                placeholder="Ex: João da Silva"
                value={clientSignerName}
                onChange={(e) => setClientSignerName(e.target.value)}
                autoComplete="name"
              />
              {/* Subtítulo com nome do estabelecimento */}
              {clientLabel && (
                <p className="text-muted-foreground text-xs">
                  Responsável por:{" "}
                  <span className="text-foreground font-medium">{clientLabel}</span>
                </p>
              )}
            </div>

            <SignaturePad key="client" onDataUrl={setClientDataUrl} />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">{error}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={isProfessional ? () => onOpenChange(false) : () => { setError(null); setStep("professional"); setClientDataUrl(null); }}
          >
            {isProfessional ? "Cancelar" : "← Voltar"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={isProfessional ? handleNext : handleConfirm}
          >
            {isProfessional
              ? clientSignatureRequired
                ? "Próximo →"
                : "Confirmar e aprovar dossiê"
              : "Confirmar e aprovar dossiê"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
