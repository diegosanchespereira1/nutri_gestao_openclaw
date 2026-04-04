import { Resend } from "resend";

function foldSubjectSegment(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}

export type SendDossierPdfEmailInput = {
  to: string[];
  subjectEstablishmentLine: string;
  pdfBytes: Uint8Array;
  attachmentFilename: string;
};

function safeErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 400 ? `${m.slice(0, 397)}...` : m;
}

/**
 * Envia email com PDF em anexo via Resend.
 * Requer RESEND_API_KEY e DOSSIER_EMAIL_FROM (ou RESEND_FROM_EMAIL) no servidor.
 */
export async function sendDossierPdfViaResend(
  input: SendDossierPdfEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.DOSSIER_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    return { ok: false, error: "Envio por email não configurado (RESEND_API_KEY)." };
  }
  if (!from) {
    return {
      ok: false,
      error: "Remetente não configurado (DOSSIER_EMAIL_FROM ou RESEND_FROM_EMAIL).",
    };
  }

  if (input.to.length === 0) {
    return { ok: false, error: "Sem destinatários." };
  }

  const resend = new Resend(apiKey);
  const est = foldSubjectSegment(input.subjectEstablishmentLine) || "Estabelecimento";
  const subject = `Dossiê de checklist — ${est}`;

  const buf = Buffer.from(input.pdfBytes);
  const b64 = buf.toString("base64");

  try {
    const { error } = await resend.emails.send({
      from,
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
          content: b64,
        },
      ],
    });

    if (error) {
      return { ok: false, error: safeErr(error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: safeErr(e) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
