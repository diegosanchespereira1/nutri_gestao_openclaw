"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  clientId: string;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; objectUrl: string; filename: string }
  | { status: "error"; message: string };

const FALLBACK_FILENAME = "relatorio-evolucao-checklists.pdf";

/** Extrai o filename do header Content-Disposition (best-effort). */
function filenameFromContentDisposition(header: string | null): string {
  if (!header) return FALLBACK_FILENAME;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || FALLBACK_FILENAME;
}

/**
 * Botão "Exportar" do card Evolução da pontuação.
 * Busca o PDF da rota /clientes/[id]/relatorio-evolucao/pdf via fetch
 * (sem cache) e exibe o preview num iframe com blob: URL — o CSP do app
 * usa frame-ancestors 'none', o que impede embutir a rota diretamente.
 */
export function ChecklistEvolutionExportDialog({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadPreview = useCallback(async () => {
    releaseObjectUrl();
    setPreview({ status: "loading" });
    try {
      const res = await fetch(`/clientes/${clientId}/relatorio-evolucao/pdf`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const message =
          res.status === 404
            ? "Nenhum checklist aprovado com pontuação disponível para este cliente."
            : "Não foi possível gerar o relatório. Tente novamente.";
        setPreview({ status: "error", message });
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      objectUrlRef.current = objectUrl;
      setPreview({
        status: "ready",
        objectUrl,
        filename: filenameFromContentDisposition(
          res.headers.get("content-disposition"),
        ),
      });
    } catch {
      setPreview({
        status: "error",
        message: "Não foi possível gerar o relatório. Verifique sua conexão e tente novamente.",
      });
    }
  }, [clientId, releaseObjectUrl]);

  // Libera o blob ao desmontar o componente.
  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  const handleDownload = () => {
    if (preview.status !== "ready") return;
    const a = document.createElement("a");
    a.href = preview.objectUrl;
    a.download = preview.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          void loadPreview();
        }}
      >
        <FileText className="size-4" aria-hidden />
        Exportar
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            releaseObjectUrl();
            setPreview({ status: "idle" });
          }
        }}
      >
        <DialogContent className="max-w-3xl gap-4">
          <DialogHeader>
            <DialogTitle>Relatório de evolução — checklists</DialogTitle>
            <DialogDescription>
              Pré-visualização do relatório em PDF com a evolução da pontuação,
              benchmark da carteira e histórico de avaliações aprovadas.
            </DialogDescription>
          </DialogHeader>

          <div className="border-border bg-muted/40 relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-lg border">
            {preview.status === "ready" ? (
              <iframe
                src={preview.objectUrl}
                title="Pré-visualização do relatório de evolução em PDF"
                className="h-full w-full"
              />
            ) : null}

            {preview.status === "loading" ? (
              <div
                className="absolute inset-0 flex items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Carregando…
                </span>
              </div>
            ) : null}

            {preview.status === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-muted-foreground text-sm">{preview.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadPreview()}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              disabled={preview.status !== "ready"}
              onClick={handleDownload}
            >
              <Download className="size-4" aria-hidden />
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
