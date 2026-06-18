import type { NextRequest } from "next/server";

/** Marca pedidos do app nativo Capacitor (iOS/Android) para política de sessão prolongada. */
export const NATIVE_CLIENT_COOKIE = "ng_native_client";
export const NATIVE_CLIENT_COOKIE_VALUE = "1";

/** 1 ano — cookie não-httpOnly definido pelo bootstrap / login no dispositivo. */
export const NATIVE_CLIENT_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

/**
 * WebView Android inclui `; wv)`. iOS depende do cookie `ng_native_client`
 * (definido no bootstrap inline antes da hidratação React).
 */
export function isNativeClientRequest(request: NextRequest): boolean {
  if (
    request.cookies.get(NATIVE_CLIENT_COOKIE)?.value ===
    NATIVE_CLIENT_COOKIE_VALUE
  ) {
    return true;
  }

  const ua = request.headers.get("user-agent") ?? "";
  return /Android/i.test(ua) && /; wv\)/.test(ua);
}
