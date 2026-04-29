"use client";

import { ChevronDown, ChevronUp, Eye, FileDown, Loader2, Mail, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { sendDossierPdfToClientFromSessionAction } from "@/lib/actions/checklist-fill-dossier-email";
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
  /** Todos os PDFs `ready` da sessão (inclui obsoletos), ordenados por versão descendente. */
  pdfExportHistory?: ChecklistFillPdfExportRow[];
  /** true quando RESEND e remetente estão definidos no servidor. */
  dossierEmailDeliveryConfigured?: boolean;
};

function formatJobTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
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
  pdfExportHistory = [],
  dossierEmailDeliveryConfigured = false,
}: Props) {
  const router = useRouter();
  const [job, setJob] = useState<ChecklistFillPdfExportRow | null>(initialJob);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadPending, startDownload] = useTransition();
  const [emailPending, startEmail] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  const obsoleteReadyPdfs = pdfExportHistory.filter(
    (r) => r.status === "ready" && r.superseded_at,
  );

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
      const a = document.createElement("a");
      a.href = `${r.downloadUrl}?download=1`;
      a.download = r.suggestedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  async function handleView() {
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

  async function handleDownload() {
    if (!job?.id) return;
    setLocalErr(null);
    startDownload(async () => {
      const r = await downloadDossierPdfAction(job.id);
      if (!r.ok) {
        setLocalErr(r.error);
        return;
      }
      // Forçar download em vez de abrir no navegador (mesma origem, sem URL do Storage)
      const a = document.createElement("a");
      a.href = `${r.downloadUrl}?download=1`;
      a.download = r.suggestedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  async function handleSendToClient() {
    setLocalErr(null);
    setEmailMsg(null);
    startEmail(async () => {
      const r = await sendDossierPdfToClientFromSessionAction(sessionId);
      if (!r.ok) {
        setEmailMsg(r.error);
        return;
      }
      setEmailMsg("Email enviado com o PDF em anexo.");
      router.refresh();
    });
  }

  const showProcessing =
    job?.status === "processing" || job?.status === "pending";

  return (
    <div className="border-border rounded-lg border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-foreground font-medium">PDF do relatório</p>
        {job?.status === "ready" && job.version_number ? (
          <span className="bg-muted text-foreground/90 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
            PDF v{job.version_number}
          </span>
        ) : null}
      </div>
      <p className="text-foreground/85 mt-1 text-xs">
        Relatório com texto do dossiê, identificação do profissional (CRN) e fotos de evidência embutidas no PDF.
      </p>

      {showProcessing ? (
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          Gerando PDF… Se ficar preso, recarregue a página ou tente gerar de novo.
        </p>
      ) : null}

      {job?.status === "ready" ? (
        <p className="text-foreground/85 mt-2 text-xs">
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
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadPending}
              onClick={() => void handleView()}
              className="gap-1.5"
            >
              {downloadPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
              Visualizar PDF
            </Button>

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
              Baixar PDF
            </Button>
          </>
        ) : null}
      </div>

      {obsoleteReadyPdfs.length > 0 ? (
        <div className="mt-3 border-t pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-foreground/90 hover:text-foreground flex w-full items-center justify-between gap-2 text-left text-xs font-medium"
          >
            <span>Versões anteriores (obsoletas)</span>
            {historyOpen ? (
              <ChevronUp className="size-4 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            )}
          </button>
          {historyOpen ? (
            <ul className="text-foreground/85 mt-2 space-y-2 text-xs">
              {obsoleteReadyPdfs.map((row) => (
                <li
                  key={row.id}
                  className="bg-muted/40 rounded-md border border-border/60 px-3 py-2"
                >
                  <p className="font-medium text-foreground">
                    PDF v{row.version_number} — Obsoleto
                    {row.superseded_by_version != null
                      ? `. Substituído pela versão v${row.superseded_by_version}.`
                      : ". Novo PDF ainda não foi gerado após a reabertura."}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Gerado em {formatJobTime(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {dossierEmailDeliveryConfigured ? (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={emailPending}
            onClick={() => void handleSendToClient()}
            className="gap-1.5 w-fit"
          >
            {emailPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Mail className="size-4" aria-hidden />
            )}
            Enviar PDF ao cliente
          </Button>
          {emailMsg ? (
            <p
              className={
                emailMsg.startsWith("Email enviado")
                  ? "text-muted-foreground text-xs"
                  : "text-destructive text-xs"
              }
              role="status"
            >
              {emailMsg}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
          Envio por email para o cliente não está disponível (configure Resend no
          servidor).
        </p>
      )}
    </div>
  );
}
