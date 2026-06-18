"use client";

import {
  NATIVE_CLIENT_COOKIE,
  NATIVE_CLIENT_COOKIE_MAX_AGE_SEC,
  NATIVE_CLIENT_COOKIE_VALUE,
} from "@/lib/auth/native-client-cookie";

/** Persiste marca de cliente nativo para o middleware aplicar sessão longa. */
export function persistNativeClientCookie(): void {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${NATIVE_CLIENT_COOKIE}=${NATIVE_CLIENT_COOKIE_VALUE}; path=/; max-age=${NATIVE_CLIENT_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}
