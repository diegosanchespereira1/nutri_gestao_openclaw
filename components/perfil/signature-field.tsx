"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
  return true;
}

/**
 * Campo de captura da assinatura do profissional.
 * Desenho no canvas → grava o PNG (data URL) no hidden input `signature_data`.
 * Mostra a assinatura atual e permite removê-la (hidden `remove_signature`).
 */
export function SignatureField({
  defaultUrl,
  showLabel = true,
}: {
  defaultUrl: string | null;
  showLabel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [removed, setRemoved] = useState(false);

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

  const point = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    last.current = point(e, canvas);
    canvas.setPointerCapture(e.pointerId);
  }, []);

  const move = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(e, canvas);
    const prev = last.current ?? p;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!isCanvasEmpty(canvas)) {
      setIsEmpty(false);
      setRemoved(false);
      setDataUrl(canvas.toDataURL("image/png"));
    }
  }, []);

  const stop = useCallback(() => {
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas && !isCanvasEmpty(canvas)) setDataUrl(canvas.toDataURL("image/png"));
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setIsEmpty(true);
    setDataUrl("");
  }, []);

  const showCurrent = defaultUrl && !removed && isEmpty;

  return (
    <div className="space-y-2">
      {showLabel ? <Label>Assinatura do profissional</Label> : null}
      <input type="hidden" name="signature_data" value={dataUrl} />
      <input type="hidden" name="remove_signature" value={removed ? "1" : ""} />

      {showCurrent ? (
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={defaultUrl} alt="Assinatura atual" className="h-16 w-auto" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setRemoved(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remover
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={cn(
                "block h-36 w-full touch-none rounded-lg border-2 bg-white cursor-crosshair",
                isEmpty ? "border-dashed border-border" : "border-primary/40",
              )}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={stop}
              onPointerLeave={stop}
            />
            {isEmpty && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex select-none items-center gap-2 text-sm text-muted-foreground">
                  <Pen className="h-4 w-4" />
                  Assine aqui com o mouse, toque ou caneta
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clear}>
                <Eraser className="mr-1.5 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
            {defaultUrl && removed && (
              <span className="text-xs text-muted-foreground">
                A assinatura atual será removida ao salvar.
              </span>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Usada nos relatórios e documentos que exigem sua assinatura.
      </p>
    </div>
  );
}
