"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseNavigationGuardOptions = {
  /** Ativar o guard. Passar false quando o dossiê estiver aprovado. */
  active: boolean;
  /** Callback chamado APÓS o usuário confirmar a saída (para fazer redirect, etc.). */
  onConfirmLeave: () => void;
};

type UseNavigationGuardReturn = {
  /** true quando o modal de confirmação deve ser exibido (back button pressionado). */
  guardTriggered: boolean;
  /** Chamar quando o usuário confirma que quer sair. */
  confirmLeave: () => void;
  /** Chamar quando o usuário decide permanecer na página. */
  cancelLeave: () => void;
};

/**
 * Intercepta a navegação acidental (botão Voltar do browser e fechamento de aba)
 * durante o preenchimento de um checklist.
 *
 * - `beforeunload` → aviso nativo do browser ao fechar aba / recarregar.
 * - `popstate` → ao pressionar Voltar, repõe a URL e exibe o modal customizado.
 */
export function useNavigationGuard(
  options: UseNavigationGuardOptions,
): UseNavigationGuardReturn {
  const { active, onConfirmLeave } = options;
  const [guardTriggered, setGuardTriggered] = useState(false);
  const onConfirmLeaveRef = useRef(onConfirmLeave);
  onConfirmLeaveRef.current = onConfirmLeave;

  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!activeRef.current) return;
      // Retornar uma string não-vazia ativa o aviso nativo do browser.
      e.preventDefault();
      // Chrome requer returnValue (obsoleto, mas necessário para compatibilidade).
      e.returnValue = "";
      return "";
    }

    function handlePopState() {
      if (!activeRef.current) return;
      // Repõe a URL atual para que o browser não navegue de facto.
      history.pushState(null, "", window.location.href);
      // Exibe o modal customizado.
      setGuardTriggered(true);
    }

    // Empurra um estado extra para que o popstate possa ser interceptado.
    history.pushState(null, "", window.location.href);

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []); // Apenas no mount/unmount — usa refs para aceder ao estado corrente.

  const confirmLeave = useCallback(() => {
    setGuardTriggered(false);
    onConfirmLeaveRef.current();
  }, []);

  const cancelLeave = useCallback(() => {
    setGuardTriggered(false);
  }, []);

  return { guardTriggered, confirmLeave, cancelLeave };
}
