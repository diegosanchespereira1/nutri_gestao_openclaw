'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/mobile/platform';

/**
 * No app nativo (Capacitor):
 * 1. Intercepta links _blank internos e navega no WebView
 * 2. Intercepta window.open interno e usa location.href
 * 3. Reseta o zoom do viewport ao sair de qualquer campo de formulário
 *    (permite zoom por acessibilidade, mas volta ao normal automaticamente)
 */
export function CapacitorLinkInterceptor() {
  useEffect(() => {
    if (!isNativeApp()) return;

    // ── 1. Reset de zoom ao sair de inputs ────────────────────────────────────
    // iOS permite zoom em inputs para acessibilidade, mas o estado de zoom
    // persiste após o usuário sair do campo. Este handler força o retorno ao
    // zoom=1 sempre que um input/select/textarea perde o foco.
    function resetViewportZoom() {
      const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (!viewport) return;

      // Passo 1: travar em maximum-scale=1 para forçar o browser a resetar
      const original = viewport.content;
      viewport.content =
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';

      // Passo 2: depois de um frame, restaurar para permitir zoom de acessibilidade
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewport.content = original.includes('maximum-scale')
            ? original
            : original + ', maximum-scale=5';
        });
      });
    }

    // Escutar focusout em qualquer input/select/textarea da página
    function handleFocusOut(e: FocusEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        resetViewportZoom();
      }
    }

    document.addEventListener('focusout', handleFocusOut, true);

    // ── 2. Interceptar <a target="_blank"> interno ────────────────────────────
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const isBlank = anchor.target === '_blank' || anchor.target === '_new';
      if (!isBlank) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      e.preventDefault();
      window.location.href = anchor.href;
    }

    document.addEventListener('click', handleClick, true);

    // ── 3. Interceptar window.open interno ────────────────────────────────────
    const originalOpen = window.open.bind(window);
    window.open = function (url, target, features) {
      if ((target === '_blank' || target === '_new') && url && typeof url === 'string') {
        try {
          const parsed = new URL(url, window.location.href);
          if (parsed.origin === window.location.origin) {
            window.location.href = url;
            return null;
          }
        } catch { /* URL inválida */ }
      }
      return originalOpen(url, target, features);
    };

    return () => {
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('click', handleClick, true);
      window.open = originalOpen;
    };
  }, []);

  return null;
}
