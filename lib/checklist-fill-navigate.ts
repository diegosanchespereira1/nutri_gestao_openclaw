"use client";

import { suspendNavigationGuardOnce } from "@/lib/client/suspend-navigation-guard";
import { signalNavigationStart } from "@/lib/navigation-pending";

/**
 * Navegação completa para o preenchimento do checklist.
 * Evita corrida entre server action (revalidate/refresh do App Router na rota
 * /checklists) e router.push/replace — padrão igual a navigateAfterAuth.
 */
export function navigateToChecklistFill(
  sessionId: string,
  options?: { returnTo?: string },
): void {
  signalNavigationStart();
  const url = new URL(
    `/checklists/preencher/${sessionId}`,
    window.location.origin,
  );
  if (options?.returnTo) {
    url.searchParams.set("returnTo", options.returnTo);
  }
  suspendNavigationGuardOnce();
  window.location.assign(`${url.pathname}${url.search}`);
}
