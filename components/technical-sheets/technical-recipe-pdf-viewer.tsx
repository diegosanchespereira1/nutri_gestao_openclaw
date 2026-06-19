"use client";

import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { buildLoginRedirectPath } from "@/lib/auth/safe-next-path";
import { navigateBack } from "@/lib/navigation/navigate-back";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  recipeName: string;
  suggestedFilename: string;
};

export function TechnicalRecipePdfViewer({
  recipeId,
  recipeName,
  suggestedFilename,
}: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadPending, startDownload] = useTransition();

  const pdfUrl = `/api/ficha-tecnica/${recipeId}/pdf`;
  const pdfDownloadUrl = `${pdfUrl}?download=1`;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setIframeLoaded(false);
      setError(null);
      blobRef.current = null;
      setPreviewUrl(null);

      try {
        const response = await fetch(pdfUrl, { credentials: "same-origin" });
        if (!response.ok) {
          if (!cancelled) {
            if (response.status === 401) {
              const returnPath = `${window.location.pathname}${window.location.search}`;
              window.location.assign(
                buildLoginRedirectPath(returnPath, {
                  reason: "session_expired",
                }),
              );
              return;
            }
            setError(
              "Não foi possível carregar o PDF.",
            );
          }
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        blobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar o PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  const triggerDownload = useCallback(
    (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = suggestedFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    },
    [suggestedFilename],
  );

  const handlePrint = useCallback(() => {
    setError(null);
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  }, [previewUrl]);

  const handleDownload = useCallback(() => {
    setError(null);
    startDownload(async () => {
      try {
        if (blobRef.current) {
          triggerDownload(blobRef.current);
          return;
        }

        const response = await fetch(pdfDownloadUrl, { credentials: "same-origin" });
        if (!response.ok) {
          setError("Não foi possível baixar o PDF.");
          return;
        }
        triggerDownload(await response.blob());
      } catch {
        setError("Não foi possível baixar o PDF.");
      }
    });
  }, [pdfDownloadUrl, triggerDownload]);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigateBack(router, "/ficha-tecnica")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground -ml-2 gap-1.5 px-2",
            )}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Voltar
          </button>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Ficha técnica em PDF
          </h1>
          <p className="text-muted-foreground text-sm">{recipeName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!previewUrl || loading}
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="size-4 shrink-0" aria-hidden />
            Imprimir
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloadPending || loading}
            onClick={() => void handleDownload()}
            className="gap-1.5"
          >
            {downloadPending ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4 shrink-0" aria-hidden />
            )}
            Baixar PDF
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="border-border bg-muted/30 relative min-h-[70vh] flex-1 overflow-hidden rounded-lg border">
        {loading || !previewUrl ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            A carregar PDF…
          </div>
        ) : null}
        {previewUrl ? (
          <iframe
            ref={iframeRef}
            title={`PDF da ficha técnica — ${recipeName}`}
            src={previewUrl}
            className="bg-background h-full min-h-[70vh] w-full"
            onLoad={() => setIframeLoaded(true)}
          />
        ) : null}
        {previewUrl && !iframeLoaded && !loading ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            A preparar visualização…
          </div>
        ) : null}
      </div>
    </div>
  );
}
