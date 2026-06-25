import { getServerAppOrigin } from "@/lib/app-origin";
import { escapeHtml } from "@/lib/email/html-utils";
import { sendEmailViaSmtp } from "@/lib/email/send-via-smtp";
import { LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";

export type SendAccountDeletionRequestEmailInput = {
  to: string;
  recipientName: string;
  token: string;
  expiresAt: Date;
};

export async function sendAccountDeletionRequestEmailSmtp(
  input: SendAccountDeletionRequestEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  <p><a href="${confirmLink}">Confirmar encerramento do acesso</a></p>
  <p><a href="${cancelLink}">Cancelar pedido</a></p>
  <p style="color:#666;font-size:13px">Mensagem enviada pela aplicação NutriGestão.</p>
</body>
</html>`;

  return sendEmailViaSmtp({
    to: input.to,
    subject: "Confirme ou cancele o pedido de encerramento de acesso — NutriGestão",
    html,
  });
}
