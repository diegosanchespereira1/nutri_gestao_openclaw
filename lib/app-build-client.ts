"use client";

import { getPublicRuntimeEnv } from "@/lib/env/public-runtime";

/** Lê o build id no browser (meta, runtime-env ou fallback). */
export function getClientAppBuildId(): string {
  if (typeof document !== "undefined") {
    const meta = document
      .querySelector('meta[name="app-build-id"]')
      ?.getAttribute("content")
      ?.trim();
    if (meta) return meta;
  }
  const fromRuntime = getPublicRuntimeEnv().buildId;
  if (fromRuntime) return fromRuntime;
  return "dev";
}
