import "server-only";

/** SMTP da aplicação (dossiê, portal externo, LGPD). Use o mesmo servidor do GoTrue. */
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_ADMIN_EMAIL?.trim();

  if (!host || !user || !pass || !from) return null;

  const port = portRaw ? Number.parseInt(portRaw, 10) : 587;
  if (!Number.isFinite(port)) return null;

  const secure =
    process.env.SMTP_SECURE?.trim() === "true" || port === 465;

  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return readSmtpConfig() !== null;
}

export function smtpNotConfiguredMessage(): string {
  return (
    "SMTP não configurado no servidor (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)."
  );
}
