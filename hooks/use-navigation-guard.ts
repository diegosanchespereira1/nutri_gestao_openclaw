"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseNavigationGuardOptions = {
  /** Ativar o guard. Passar false quando o dossiê estiver aprovado. */
  active: boolean;
  /** Destino se o histórico do browser for insuficiente (ex.: abriu numa aba nova). */
  fallbackHref?: string;
};

type UseNavigationGuardReturn = {
  /** true quando o modal de confirmação deve ser exibido (botão Voltar do browser pressionado). */
  guardTriggered: boolean;
  /** Fecha o aviso de saída (Voltar do browser) sem navegar. */
  cancelLeave: () => void;
  /** Desactiva o guard e navega para a página anterior no histórico. */
  completeBrowserBack: () => void;
};

/**
 * Intercepta a navegação acidental (botão Voltar do browser e fechamento de aba)
 * durante o preenchimento de um checklist.
 *
 * - `beforeunload` → aviso nativo do browser ao fechar aba / recarregar.
 * - `popstate` → repõe a entrada sentinel; o modal "Sair?" só abre fora de uma janela
 *   curta após instalar o sentinel (evita eco do App Router / histórico ao abrir a página).
 */
export function useNavigationGuard(
  options: UseNavigationGuardOptions,
): UseNavigationGuardReturn {
  const { active, fallbackHref = "/checklists" } = options;
  const [guardTriggered, setGuardTriggered] = useState(false);
  const activeRef = useRef(active);
  const guardPushedRef = useRef(false);
  const completingRef = useRef(false);
  const fallbackHrefRef = useRef(fallbackHref);
  /** Ignorar abertura do modal por `popstate` logo após instalar o sentinel (Next.js / histórico). */
  const suppressLeaveModalUntilRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    fallbackHrefRef.current = fallbackHref;
  }, [fallbackHref]);

  useEffect(() => {
    if (!active) {
      guardPushedRef.current = false;
      return;
    }

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!activeRef.current || completingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    }

    function handlePopState() {
      if (completingRef.current) return;
      if (!activeRef.current) return;
      // Repõe sempre a entrada sentinel para não perder o estado da página.
      history.pushState({ navGuard: 1 }, "", window.location.href);
      if (Date.now() < suppressLeaveModalUntilRef.current) return;
      setGuardTriggered(true);
    }

    if (!guardPushedRef.current) {
      history.pushState({ navGuard: 1 }, "", window.location.href);
      guardPushedRef.current = true;
    }
    suppressLeaveModalUntilRef.current = Date.now() + 600;

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [active]);

  const cancelLeave = useCallback(() => {
    setGuardTriggered(false);
  }, []);

  const completeBrowserBack = useCallback(() => {
    completingRef.current = true;
    activeRef.current = false;
    setGuardTriggered(false);

    // Entrada sentinel + página actual: recuar 2 níveis volta à origem (ex.: /inicio).
    if (window.history.length > 2) {
      history.go(-2);
      return;
    }

    window.location.assign(fallbackHrefRef.current);
  }, []);

  return { guardTriggered, cancelLeave, completeBrowserBack };
}
