/**
 * Indica se o envio de dossiê por email (Resend) está configurado no ambiente.
 * Usar só em Server Components / Server Actions (variáveis sem NEXT_PUBLIC_).
 */
export function isDossierEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      (process.env.DOSSIER_EMAIL_FROM?.trim() ||
        process.env.RESEND_FROM_EMAIL?.trim()),
  );
}
