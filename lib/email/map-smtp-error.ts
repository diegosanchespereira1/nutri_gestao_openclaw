export type MappedSmtpError = {
  /** Código curto para o suporte (ex.: SMTP-AUTH-001). */
  code: string;
  /** Mensagem para o utilizador, em português. */
  message: string;
};

function rawSmtpErrorText(raw: unknown): string {
  if (raw instanceof Error) return raw.message.trim();
  return String(raw ?? "").trim();
}

/**
 * Converte erros técnicos do nodemailer/SMTP em mensagem curta em português + código de suporte.
 */
export function mapSmtpError(raw: unknown): MappedSmtpError {
  const text = rawSmtpErrorText(raw);
  const lower = text.toLowerCase();

  if (
    /535|badcredentials|username and password not accepted|invalid login|authentication failed|auth\./i.test(
      text,
    )
  ) {
    return {
      code: "SMTP-AUTH-001",
      message:
        "Não foi possível enviar o e-mail. Credenciais SMTP inválidas (código SMTP-AUTH-001).",
    };
  }

  if (/econnrefused|enotfound|etimedout|ehostunreach|connection closed|connect e/i.test(lower)) {
    return {
      code: "SMTP-CONN-001",
      message:
        "Não foi possível enviar o e-mail. Servidor SMTP indisponível (código SMTP-CONN-001).",
    };
  }

  if (/certificate|tls|ssl|self signed|handshake/i.test(lower)) {
    return {
      code: "SMTP-TLS-001",
      message:
        "Não foi possível enviar o e-mail. Falha de segurança na ligação SMTP (código SMTP-TLS-001).",
    };
  }

  if (/550|553|554|mailbox|recipient|relay|rejected/i.test(text)) {
    return {
      code: "SMTP-RCPT-001",
      message:
        "Não foi possível enviar o e-mail. Destinatário recusado pelo servidor (código SMTP-RCPT-001).",
    };
  }

  if (/message size|too large|552/i.test(lower)) {
    return {
      code: "SMTP-SIZE-001",
      message:
        "Não foi possível enviar o e-mail. Anexo ou mensagem demasiado grande (código SMTP-SIZE-001).",
    };
  }

  return {
    code: "SMTP-GEN-001",
    message:
      "Não foi possível enviar o e-mail. Tente novamente ou contacte o suporte (código SMTP-GEN-001).",
  };
}
