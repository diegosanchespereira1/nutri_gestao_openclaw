import { pingWorkspaceAuthAction } from "@/lib/actions/auth-context";
import { tryRefreshSupabaseSession } from "@/lib/client/refresh-supabase-session";
import { isStaleServerActionError } from "@/lib/client/server-action-errors";

const DEFAULT_ATTEMPTS = 10;
const DEFAULT_DELAY_MS = 300;

/**
 * Aguarda o servidor reconhecer a sessão após login/refresh no browser.
 * Evita loop no dialog de recuperação: o cliente pode ter sessão antes dos cookies
 * chegarem às server actions.
 */
export async function waitForServerAuthReady(options?: {
  maxAttempts?: number;
  delayMs?: number;
}): Promise<"ready" | "stale" | "timeout"> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await tryRefreshSupabaseSession();
    try {
      const ping = await pingWorkspaceAuthAction();
      if (ping.ok) return "ready";
    } catch (error) {
      if (isStaleServerActionError(error)) return "stale";
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return "timeout";
}
