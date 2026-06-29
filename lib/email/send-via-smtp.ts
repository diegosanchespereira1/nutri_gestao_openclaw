import "server-only";

import nodemailer from "nodemailer";

import { readSmtpConfig, smtpNotConfiguredMessage } from "@/lib/email/smtp-config";
import { mapSmtpError } from "@/lib/email/map-smtp-error";

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export type SmtpAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function sendEmailViaSmtp(input: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: SmtpAttachment[];
}): Promise<SendEmailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) {
    return { ok: false, error: smtpNotConfiguredMessage() };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (to.length === 0) {
    return { ok: false, error: "Sem destinatários." };
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });

    await transport.sendMail({
      from: cfg.from,
      to: to.join(", "),
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? "application/octet-stream",
      })),
    });

    return { ok: true };
  } catch (e) {
    const mapped = mapSmtpError(e);
    console.error("[smtp]", mapped.code, rawSmtpDetail(e));
    return { ok: false, error: mapped.message };
  }
}

function rawSmtpDetail(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw ?? "");
  return text.trim().slice(0, 200);
}
