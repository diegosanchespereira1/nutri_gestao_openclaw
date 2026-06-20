import { pingWorkspaceAuthAction } from "@/lib/actions/auth-context";
import { tryRefreshSupabaseSession } from "@/lib/client/refresh-supabase-session";

const RETRY_DELAYS_MS = [0, 200, 400, 600, 800];

/**
 * Confirma que a sessão está mesmo inválida no servidor antes de forçar login.
 * Usa várias tentativas — evita logout por corrida de cookies entre pedidos paralelos.
 */
export async function confirmAuthLost(): Promise<boolean> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    try {
      const activity = await fetch("/api/auth/session-activity", {
        credentials: "include",
        cache: "no-store",
      });
      if (activity.status === 204) return false;
    } catch {
      // Rede instável nesta tentativa — segue para ping.
    }

    try {
      const ping = await pingWorkspaceAuthAction();
      if (ping.ok) return false;
    } catch {
      // Server action indisponível nesta tentativa.
    }

    if (attempt < RETRY_DELAYS_MS.length - 1) {
      try {
        await tryRefreshSupabaseSession();
      } catch {
        // Ignora falha pontual de refresh.
      }
    }
  }

  return true;
}
