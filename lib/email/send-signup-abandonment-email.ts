import { sendEmailViaSmtp } from "@/lib/email/send-via-smtp";
import { getServerAppOrigin } from "@/lib/app-origin";
import { buildSignupAbandonmentEmailHtml } from "@/lib/signup/abandonment-email";
import type { SignupIntentRow } from "@/lib/signup/types";

export function readSignupAbandonmentNotifyEmail(): string | null {
  return process.env.SIGNUP_ABANDONMENT_NOTIFY_EMAIL?.trim() || null;
}

export async function sendSignupAbandonmentEmail(
  intent: SignupIntentRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = readSignupAbandonmentNotifyEmail();
  if (!to) {
    return { ok: false, error: "SIGNUP_ABANDONMENT_NOTIFY_EMAIL ausente." };
  }
  const { subject, html } = buildSignupAbandonmentEmailHtml({
    intent,
    adminUrl: `${getServerAppOrigin()}/admin/cadastros`,
  });
  return sendEmailViaSmtp({ to, subject, html });
}
