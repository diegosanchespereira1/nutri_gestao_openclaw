import { isSmtpConfigured } from "@/lib/email/smtp-config";

/** Envio de dossiê por email (SMTP no servidor da app). */
export function isDossierEmailDeliveryConfigured(): boolean {
  return isSmtpConfigured();
}
