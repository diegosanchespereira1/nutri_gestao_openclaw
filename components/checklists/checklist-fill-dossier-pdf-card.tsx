"use client";

import { FileDown, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  downloadDossierPdfAction,
  generateDossierPdfAction,
} from "@/lib/actions/checklist-fill-pdf-export";
import { Button } from "@/components/ui/button";
import type { ChecklistFillPdfExportRow } from "@/lib/types/checklist-fill-pdf";

type Props = {
  sessionId: string;
  dossierApprovedAt: string | null;
  initialJob: ChecklistFillPdfExportRow | null;
};

function formatJobTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ChecklistFillDossierPdfCard({
  sessionId,
  dossierApprovedAt,
  initialJob,
}: Props) {
  const router = useRouter();
  const [job, setJob] = useState<ChecklistFillPdfExportRow | null>(initialJob);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadPending, startDownload] = useTransition();

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  if (!dossierApprovedAt) return null;

  async function handleGenerate() {
    setLocalErr(null);
    startTransition(async () => {
      const r = await generateDossierPdfAction(sessionId);
      if (!r.ok) {
        setLocalErr(r.error);
        router.refresh();
        return;
      }
      setJob(r.job);
      router.refresh();
      window.open(r.downloadUrl, "_blank", "noopener,noreferrer");
    });
  }

  async function handleDownload() {
    if (!job?.id) return;
    setLocalErr(null);
    startDownload(async () => {
      const r = await downloadDossierPdfAction(job.id);
      if (!r.ok) {
        setLocalErr(r.error);
        return;
      }
      window.open(r.downloadUrl, "_blank", "noopener,noreferrer");
    });
  }

  const showProcessing =
    job?.status === "processing" || job?.status === "pending";

  return (
    <div className="border-border rounded-lg border bg-card/50 p-4 text-sm">
      <p className="text-foreground font-medium">PDF do relatório</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Gera um ficheiro com o texto do dossié e a identificação do profissional (CRN). As
        fotos de evidência não são embutidas no PDF.
      </p>

      {showProcessing ? (
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          A gerar PDF… Se ficar preso, recarregue a página ou tente gerar de novo.
        </p>
      ) : null}

      {job?.status === "ready" ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Último PDF: {formatJobTime(job.updated_at ?? job.created_at)}
        </p>
      ) : null}

      {job?.status === "failed" && job.error_message ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {job.error_message}
        </p>
      ) : null}

      {localErr ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {localErr}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void handleGenerate()}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : job?.status === "ready" ? (
            <RefreshCw className="size-4" aria-hidden />
          ) : null}
          {job?.status === "ready" ? "Gerar novamente" : "Gerar PDF"}
        </Button>

        {job?.status === "ready" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloadPending}
            onClick={() => void handleDownload()}
            className="gap-1.5"
          >
            {downloadPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="size-4" aria-hidden />
            )}
            Transferir PDF
          </Button>
        ) : null}
      </div>
    </div>
  );
}
