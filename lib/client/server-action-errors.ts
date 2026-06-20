export const STALE_SERVER_ACTION_MESSAGE =
  "A aplicação foi atualizada. Recarregue a página para continuar gravando.";

/** Server action hash inválido após deploy ou hot reload do Next.js (dev). */
export function isStaleServerActionError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unrecognizedactionerror") ||
    normalized.includes("failed to find server action") ||
    normalized.includes("failed-to-find-server-action")
  );
}
