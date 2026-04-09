import { Resend } from "resend";

import { getServerAppOrigin } from "@/lib/app-origin";
import { LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendAccountDeletionRequestEmailInput = {
  to: string;
  recipientName: string;
  token: string;
  expiresAt: Date;
};

/**
 * Email de pedido de encerramento de acesso: links para confirmar ou cancelar (24h).
 */
export async function sendAccountDeletionRequestEmailResend(
  input: SendAccountDeletionRequestEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.NOTIFICATION_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.DOSSIER_EMAIL_FROM?.trim();

  if (!apiKey) {
    return { ok: false, error: "Envio por email não configurado (RESEND_API_KEY)." };
  }
  if (!from) {
    return {
      ok: false,
      error:
        "Remetente não configurado (NOTIFICATION_EMAIL_FROM, RESEND_FROM_EMAIL ou DOSSIER_EMAIL_FROM).",
    };
  }

  const origin = getServerAppOrigin();
  const base = `${origin}/configuracoes/deletar-conta`;
  const confirmLink = `${base}?token=${encodeURIComponent(input.token)}&action=confirm`;
  const cancelLink = `${base}?token=${encodeURIComponent(input.token)}&action=cancel`;

  const name = escapeHtml(input.recipientName || "Utilizador");
  const expires = input.expiresAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Olá, <strong>${name}</strong>,</p>
  <p>Recebemos um pedido para <strong>encerrar o acesso</strong> à sua conta na NutriGestão.</p>
  <p><strong>Este pedido expira em:</strong> ${escapeHtml(expires)}</p>
  <p>Após confirmar, o login deixa de ser permitido. Os dados clínicos permanecem retidos pelo período legal (mínimo <strong>${LGPD_RETENTION_YEARS} anos</strong>).</p>
  <p>Para <strong>confirmar</strong> o encerramento do acesso, inicie sessão na aplicação (se necessário) e abra o link:</p>
  <p><a href="${confirmLink}">Confirmar encerramento do acesso</a></p>
  <p>Para <strong>cancelar</strong> o pedido dentro de 24 horas:</p>
  <p><a href="${cancelLink}">Cancelar pedido</a></p>
  <p style="color:#666;font-size:13px">Mensagem enviada pela aplicação NutriGestão.</p>
</body>
</html>
`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: "Confirme ou cancele o pedido de encerramento de acesso — NutriGestão",
      html,
    });
    if (error) {
      return { ok: false, error: error.message ?? "Falha ao enviar email" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 200) };
  }
}
