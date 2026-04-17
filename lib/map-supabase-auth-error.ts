/** Erro devolvido pelos métodos Auth (message, code e por vezes HTTP status). */
export type SupabaseAuthLikeError = {
  message: string;
  code?: string;
  status?: number;
};

/** Mensagens mais claras para erros comuns do GoTrue (login). */
export function mapSupabaseLoginError(err: SupabaseAuthLikeError): string {
  const code = err.code;
  if (
    code === "email_not_confirmed" ||
    code === "provider_email_needs_verification"
  ) {
    return "Confirme o email antes de entrar (use a ligação enviada para a sua caixa de entrada).";
  }
  if (code === "invalid_credentials") {
    return "Email ou senha incorretos.";
  }
  if (
    code === "over_request_rate_limit" ||
    code === "too_many_requests"
  ) {
    return "Demasiadas tentativas. Aguarde um pouco e tente novamente.";
  }

  const m = err.message.toLowerCase();

  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Confirme o email antes de entrar (use a ligação enviada para a sua caixa de entrada).";
  }
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("wrong password")
  ) {
    return "Email ou senha incorretos.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiadas tentativas. Aguarde um pouco e tente novamente.";
  }

  return err.message;
}

/** Erros de `resetPasswordForEmail` (incl. limite de taxa do GoTrue). */
export function mapSupabaseRecoverPasswordError(
  err: SupabaseAuthLikeError,
): string {
  if (err.status === 429) {
    return "Limite temporário de pedidos de recuperação atingido (proteção do Supabase por rede ou por email). Aguarde alguns minutos e tente de novo; se estiver numa VPN, experimente sem ela.";
  }
  const code = err.code;
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "too_many_requests"
  ) {
    return "Limite temporário de envio de emails atingido. Aguarde alguns minutos e tente de novo.";
  }

  const m = err.message.toLowerCase();
  if (
    m.includes("email rate limit") ||
    m.includes("over_email_send")
  ) {
    return "Limite de envio de emails de autenticação do projeto Supabase atingido (conta todos os emails: confirmação, recuperação, etc.). Aguarde até a janela de tempo resetar ou configure SMTP próprio em Authentication → Emails.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Limite temporário de pedidos atingido. Aguarde alguns minutos e tente de novo.";
  }

  return "Não foi possível concluir o pedido. Tente mais tarde ou contacte suporte.";
}
