import { escapeHtml } from "@/lib/email/html-utils";
import { sendEmailViaSmtp } from "@/lib/email/send-via-smtp";

export async function sendSignupConfirmationEmail(input: {
  email: string;
  fullName: string;
  actionLink: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = escapeHtml(input.fullName.trim() || "Olá");
  const link = escapeHtml(input.actionLink);
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0B2420; background:#F4F9F8; padding:24px;">
  <p>Olá, <strong>${name}</strong>.</p>
  <p>Seu pagamento foi confirmado. Para liberar o acesso à NutriGestão, confirme o e-mail:</p>
  <p><a href="${link}" style="display:inline-block;background:#248C7F;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">Confirmar e-mail</a></p>
  <p style="color:#456E68;font-size:13px">Se o botão não funcionar, copie este link:<br />${link}</p>
</body>
</html>`;

  return sendEmailViaSmtp({
    to: input.email.trim(),
    subject: "Confirme seu e-mail — NutriGestão",
    html,
  });
}
