"use client";

/**
 * Mantém o token Supabase renovado — crítico no app nativo, onde timers JS
 * são suspensos em background e o middleware web deixa de receber pedidos.
 *
 * Estratégias:
 *  1. visibilitychange — renova ao voltar à aba/WebView.
 *  2. Intervalo periódico enquanto visível.
 *  3. Renova proativamente se o access token expira em breve.
 *  4. No app nativo: intervalo mais curto + refresh forçado ao retomar.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/mobile/platform";

const WEB_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const NATIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const WEB_REFRESH_AHEAD_SEC = 15 * 60;
const NATIVE_REFRESH_AHEAD_SEC = 30 * 60;

function getRefreshIntervalMs(): number {
  return isNativeApp() ? NATIVE_REFRESH_INTERVAL_MS : WEB_REFRESH_INTERVAL_MS;
}

function getRefreshAheadSec(): number {
  return isNativeApp() ? NATIVE_REFRESH_AHEAD_SEC : WEB_REFRESH_AHEAD_SEC;
}

/** Renova cookies de atividade da app (`ng_sess_*`) — evita idle timeout durante trabalho só via Server Actions. */
export async function bumpAppSessionActivity(): Promise<void> {
  try {
    await fetch("/api/auth/session-activity", {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Falha pontual de rede — o próximo ciclo tenta de novo.
  }
}

/** Renova sessão Supabase se o access token expira em breve. */
export async function refreshSessionIfNeeded(force = false): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return;

  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsUntilExpiry = expiresAt - nowSec;

  if (force || secondsUntilExpiry < getRefreshAheadSec()) {
    await supabase.auth.refreshSession();
  }
}

async function refreshSessionAndActivity(force = false): Promise<void> {
  await Promise.all([refreshSessionIfNeeded(force), bumpAppSessionActivity()]);
}

export function useSessionKeepAlive(): void {
  useEffect(() => {
    void refreshSessionAndActivity();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSessionAndActivity();
      }
    }, getRefreshIntervalMs());

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshSessionAndActivity(isNativeApp());
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
