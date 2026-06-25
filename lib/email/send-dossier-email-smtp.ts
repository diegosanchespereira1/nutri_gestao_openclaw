import { escapeHtml } from "@/lib/email/html-utils";
import { sendEmailViaSmtp } from "@/lib/email/send-via-smtp";

function foldSubjectSegment(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}

export type SendDossierPdfEmailInput = {
  to: string[];
  subjectEstablishmentLine: string;
  pdfBytes: Uint8Array;
  attachmentFilename: string;
};

/**
 * Envia dossiê em PDF via SMTP (mesmo servidor configurado no GoTrue / app).
 */
export async function sendDossierPdfViaSmtp(
  input: SendDossierPdfEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.to.length === 0) {
    return { ok: false, error: "Sem destinatários." };
  }

  const est = foldSubjectSegment(input.subjectEstablishmentLine) || "Estabelecimento";
  const subject = `Dossiê de checklist — ${est}`;

  return sendEmailViaSmtp({
    to: input.to,
    subject,
    html: `
<p>Segue em anexo o dossiê de checklist aprovado.</p>
<p><strong>Estabelecimento / contexto:</strong> ${escapeHtml(est)}</p>
<p style="color:#666;font-size:13px">Mensagem enviada pela aplicação NutriGestão.</p>
`.trim(),
    attachments: [
      {
        filename: input.attachmentFilename,
        content: Buffer.from(input.pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });
}
