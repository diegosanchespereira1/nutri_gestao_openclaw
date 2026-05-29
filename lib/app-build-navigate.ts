"use client";

import { APP_BUILD_SESSION_STORAGE_KEY } from "@/lib/app-build";
import { getClientAppBuildId } from "@/lib/app-build-client";

/** Navegação completa pós-login com bust de cache e registo da build no cliente. */
export function navigateAfterAuth(nextPath: string): void {
  const url = new URL(nextPath, window.location.origin);
  const buildId = getClientAppBuildId();
  url.searchParams.set("_v", buildId);
  sessionStorage.setItem(APP_BUILD_SESSION_STORAGE_KEY, buildId);
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
}
