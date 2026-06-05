"use client";

/**
 * Barra fina no topo da área de conteúdo — feedback sem cobrir a página anterior.
 */
export function RouteProgressBar() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando página"
      className="pointer-events-none absolute inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/15"
    >
      <div className="route-progress-bar-indeterminate h-full w-1/3 bg-primary" />
    </div>
  );
}
