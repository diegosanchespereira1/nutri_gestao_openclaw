"use client";

/**
 * useSessionKeepAlive
 *
 * Mantém o token Supabase renovado durante operações longas (ex.: preenchimento
 * de checklist), evitando o erro "Sessão expirada" ao enviar fotos.
 *
 * Problema raiz: o `autoRefreshToken` do Supabase usa `setInterval`, que é
 * suspenso pelo browser quando a aba vai para background em dispositivos móveis.
 * Quando o usuário volta, o token já pode ter expirado.
 *
 * Estratégias combinadas:
 *  1. Escuta `visibilitychange`: assim que a aba fica visível, verifica e renova.
 *  2. Intervalo periódico (a cada REFRESH_INTERVAL_MS) enquanto a aba está visível.
 *  3. Renova proativamente se o token expira em menos de REFRESH_AHEAD_SEC segundos.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Intervalo de checagem periódica enquanto a aba está ativa (10 minutos). */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Renova o token se ele expira em menos de REFRESH_AHEAD_SEC segundos.
 * Supabase access tokens duram 3600 s por padrão; renovar com 15 min de
 * antecedência garante folga mesmo com latência.
 */
const REFRESH_AHEAD_SEC = 15 * 60;

async function refreshIfNeeded(): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return; // não autenticado — nada a fazer

  const expiresAt = session.expires_at ?? 0; // Unix timestamp em segundos
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsUntilExpiry = expiresAt - nowSec;

  if (secondsUntilExpiry < REFRESH_AHEAD_SEC) {
    await supabase.auth.refreshSession();
  }
}

export function useSessionKeepAlive(): void {
  useEffect(() => {
    // Checa imediatamente ao montar (caso a sessão já esteja próxima do vencimento)
    void refreshIfNeeded();

    // Intervalo periódico enquanto a aba está visível
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshIfNeeded();
      }
    }, REFRESH_INTERVAL_MS);

    // Renova ao voltar para a aba (caso o timer tenha ficado suspenso)
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshIfNeeded();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
