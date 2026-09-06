/** Mensagens de rate limit de auth — sem jargão técnico. */

export function formatAuthRateLimitError(retryAfter: number | null): string {
  const seconds = retryAfter && retryAfter > 0 ? retryAfter : 60;
  return `Demasiadas tentativas. Tente novamente em ${seconds} segundos.`;
}

export function formatPasswordResetRateLimitError(
  retryAfter: number | null,
): string {
  const seconds = retryAfter && retryAfter > 0 ? retryAfter : 3600;
  if (seconds >= 60) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const unit = minutes === 1 ? "minuto" : "minutos";
    return `Demasiados pedidos de recuperação. Aguarde ${minutes} ${unit} e tente novamente.`;
  }
  return `Demasiados pedidos de recuperação. Tente novamente em ${seconds} segundos.`;
}
