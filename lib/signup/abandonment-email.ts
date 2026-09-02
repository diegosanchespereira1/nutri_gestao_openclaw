import { escapeHtml } from "@/lib/email/html-utils";
import { formatBrDocument } from "@/lib/format/br-document";
import { signupStatusLabel } from "@/lib/signup/abandonment";
import type { SignupIntentRow } from "@/lib/signup/types";

export function buildSignupAbandonmentEmailHtml(input: {
  intent: SignupIntentRow;
  adminUrl: string;
}): { subject: string; html: string } {
  const { intent, adminUrl } = input;
  const name = escapeHtml(
    intent.full_name || intent.legal_name || intent.responsible_name || "—",
  );
  const doc = escapeHtml(
    `${intent.document_kind.toUpperCase()} ${formatBrDocument(intent.document_id)}`,
  );
  const plan = escapeHtml(intent.plan_slug ?? "—");
  const interval =
    intent.billing_interval === "year"
      ? "anual"
      : intent.billing_interval === "month"
        ? "mensal"
        : "—";

  return {
    subject: "[NutriGestão] Cadastro abandonado no pagamento",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Uma tentativa de cadastro chegou ao pagamento e a sessão Stripe expirou sem concluir.</p>
  <table cellpadding="6" style="border-collapse:collapse">
    <tr><td>Nome</td><td><strong>${name}</strong></td></tr>
    <tr><td>E-mail</td><td>${escapeHtml(intent.email)}</td></tr>
    <tr><td>Telefone</td><td>${escapeHtml(intent.phone)}</td></tr>
    <tr><td>Documento</td><td>${doc}</td></tr>
    <tr><td>Plano</td><td>${plan} (${interval})</td></tr>
    <tr><td>Status</td><td>${escapeHtml(signupStatusLabel("abandonado"))}</td></tr>
    <tr><td>Checkout iniciado</td><td>${escapeHtml(intent.created_at)}</td></tr>
  </table>
  <p><a href="${escapeHtml(adminUrl)}">Abrir cadastros no admin</a></p>
</body>
</html>`,
  };
}
