import { buildLoginRedirectPath } from "@/lib/auth/safe-next-path";
import { suspendNavigationGuardOnce } from "@/lib/client/suspend-navigation-guard";

let redirectInFlight = false;
let suppressRedirectUntil = 0;

/** Evita redirect espúrio durante navegação intencional (ex.: próxima área do lote). */
export function suppressLoginRedirectFor(ms: number): void {
  suppressRedirectUntil = Date.now() + ms;
}

/**
 * Navegação completa para login — evita loops de server action / cookies desincronizados no SPA.
 */
export function redirectToLogin(returnPath: string): void {
  if (
    redirectInFlight ||
    typeof window === "undefined" ||
    Date.now() < suppressRedirectUntil
  ) {
    return;
  }
  redirectInFlight = true;
  suspendNavigationGuardOnce();
  window.location.assign(
    buildLoginRedirectPath(returnPath, { reason: "session_expired" }),
  );
}
