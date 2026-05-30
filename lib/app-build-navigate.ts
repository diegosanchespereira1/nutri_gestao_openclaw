"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { APP_VERSION_SESSION_STORAGE_KEY } from "@/lib/app-version";
import { getClientAppVersion } from "@/lib/app-version-client";

/** Navegação pós-login com registo da versão no cliente (SPA, sem reload completo). */
export function navigateAfterAuth(nextPath: string, router: AppRouterInstance): void {
  const version = getClientAppVersion();
  sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, version);
  const url = new URL(nextPath, window.location.origin);
  url.searchParams.delete("_v");
  router.push(`${url.pathname}${url.search}${url.hash}`);
  router.refresh();
}
