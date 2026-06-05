'use client';

import { useEffect, useState } from 'react';

/**
 * Painel decorativo lateral da tela de auth.
 * Renderiza APENAS no cliente e apenas em telas >= 1024px.
 * Nunca aparece no SSR — evita flash no Android WebView.
 */
export function DecorativePanel() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setShow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setShow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!show) return null;

  return (
    <div
      className="from-primary/15 via-background to-accent/20 text-foreground relative flex flex-col items-center justify-center bg-gradient-to-br p-12"
      aria-hidden
    >
      <div className="max-w-sm text-center">
        <p className="text-primary font-heading text-3xl font-bold tracking-tight">
          NutriGestão
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Gestão nutricional profissional.
        </p>
      </div>
    </div>
  );
}
