export const SESSION_EXPIRED_ERROR = "Sessão expirada.";

export function isSessionExpiredError(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.trim().toLowerCase();
  return (
    normalized === SESSION_EXPIRED_ERROR.toLowerCase() ||
    normalized.includes("sessão expirada")
  );
}
