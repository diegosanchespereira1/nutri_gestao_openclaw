import "server-only";

import { escapeHtml } from "@/lib/email/html-utils";
import { sendEmailViaSmtp } from "@/lib/email/send-via-smtp";

export async function sendExternalPortalInviteEmailSmtp(input: {
  email: string;
  fullName: string;
  portalUrl: string;
  inviterName?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = escapeHtml(input.fullName.trim() || "Utilizador");
  const portalUrl = escapeHtml(input.portalUrl);
  const inviter = input.inviterName?.trim()
    ? escapeHtml(input.inviterName.trim())
    : "o seu nutricionista";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Olá, <strong>${name}</strong>,</p>
  <p>${inviter} convidou-o(a) para aceder ao <strong>portal externo</strong> da NutriGestão.</p>
  <p><a href="${portalUrl}">Abrir portal</a></p>
  <p style="color:#666;font-size:13px">Este link é pessoal e expira em 7 dias.</p>
</body>
</html>`;

  return sendEmailViaSmtp({
    to: input.email.trim(),
    subject: "Convite para o portal NutriGestão",
    html,
  });
}
