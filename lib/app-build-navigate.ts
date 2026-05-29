"use client";

import { APP_VERSION_SESSION_STORAGE_KEY } from "@/lib/app-version";
import { getClientAppVersion } from "@/lib/app-version-client";

/** Navegação completa pós-login com bust de cache e registo da versão no cliente. */
export function navigateAfterAuth(nextPath: string): void {
  const url = new URL(nextPath, window.location.origin);
  const version = getClientAppVersion();
  url.searchParams.set("_v", version);
  sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, version);
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
}
