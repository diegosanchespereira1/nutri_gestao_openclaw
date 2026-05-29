"use client";

import { getPublicRuntimeEnv } from "@/lib/env/public-runtime";

/** Lê a versão no browser (meta, runtime-env ou fallback). */
export function getClientAppVersion(): string {
  if (typeof document !== "undefined") {
    const meta = document
      .querySelector('meta[name="app-version"]')
      ?.getAttribute("content")
      ?.trim();
    if (meta) return meta;
  }
  const fromRuntime = getPublicRuntimeEnv().version;
  if (fromRuntime) return fromRuntime;
  return "0.0.0-dev";
}
