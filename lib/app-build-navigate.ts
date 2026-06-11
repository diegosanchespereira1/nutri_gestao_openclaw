"use client";

import { APP_VERSION_SESSION_STORAGE_KEY } from "@/lib/app-version";
import { getClientAppVersion } from "@/lib/app-version-client";

/**
 * Navegação pós-login com registo da versão no cliente.
 * Usa `location.assign` (navegação completa) para sair de imediato do ecrã de login:
 * `router.push` + `router.refresh` esperavam a árvore RSC do destino e davam a sensação
 * de que a aplicação “travou” após credenciais válidas.
 */
export function navigateAfterAuth(nextPath: string): void {
  const version = getClientAppVersion();
  sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, version);
  const url = new URL(nextPath, window.location.origin);
  url.searchParams.delete("_v");
  const target = `${url.pathname}${url.search}${url.hash}`;
  window.location.assign(target);
}
