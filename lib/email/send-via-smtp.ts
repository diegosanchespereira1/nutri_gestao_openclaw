import "server-only";

import nodemailer from "nodemailer";

import { readSmtpConfig, smtpNotConfiguredMessage } from "@/lib/email/smtp-config";

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
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 400) };
  }
}
