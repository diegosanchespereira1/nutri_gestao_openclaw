import { isSessionExpiredError } from "@/lib/auth/session-errors";
import { tryRefreshSupabaseSession } from "@/lib/client/refresh-supabase-session";
import {
  isStaleServerActionError,
  STALE_SERVER_ACTION_MESSAGE,
} from "@/lib/client/server-action-errors";

type ActionResult = { ok: boolean; error?: string };

/**
 * Executa uma server action; se a sessão expirou, tenta refresh silencioso e repete uma vez.
 * Não faz refresh proativo — evita corrida de cookies em saves paralelos.
 */
export async function executeWithSessionRecovery<T extends ActionResult>(
  operation: () => Promise<T>,
): Promise<{ result: T; needsReauth: boolean }> {
  let result: T;
  try {
    result = await operation();
  } catch (error) {
    if (isStaleServerActionError(error)) {
      return {
        result: { ok: false, error: STALE_SERVER_ACTION_MESSAGE } as T,
        needsReauth: false,
      };
    }
    throw error;
  }

  if (result.ok || !isSessionExpiredError(result.error)) {
    return { result, needsReauth: false };
  }

  try {
    const refreshed = await tryRefreshSupabaseSession();
    if (refreshed) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        result = await operation();
      } catch (error) {
        if (isStaleServerActionError(error)) {
          return {
            result: { ok: false, error: STALE_SERVER_ACTION_MESSAGE } as T,
            needsReauth: false,
          };
        }
        throw error;
      }
      if (result.ok || !isSessionExpiredError(result.error)) {
        return { result, needsReauth: false };
      }
    }
  } catch {
    // Ignora falha de refresh na segunda tentativa.
  }

  return { result, needsReauth: true };
}
