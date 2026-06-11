type Listener = () => void;

const listeners = new Set<Listener>();
const cancelListeners = new Set<Listener>();

export function subscribeNavigationStart(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Cancela um loading iniciado por `signalNavigationStart` (links internos, pushWithLoading). */
export function subscribeNavigationCancel(listener: Listener): () => void {
  cancelListeners.add(listener);
  return () => cancelListeners.delete(listener);
}

/** Dispara o loading padrão antes de `router.push` / `router.replace`. */
export function signalNavigationStart(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Sinaliza que a navegação foi cancelada (ex.: utilizador escolheu "Não, ficar"
 * no guard do checklist). Usado por `AppMainContent` para fechar o overlay de
 * loading que foi aberto por navegação (ex.: clique em link interno).
 */
export function signalNavigationCancel(): void {
  cancelListeners.forEach((listener) => listener());
}

export function pushWithLoading(
  router: { push: (href: string) => void },
  href: string,
): void {
  signalNavigationStart();
  router.push(href);
}

export function replaceWithLoading(
  router: { replace: (href: string) => void },
  href: string,
): void {
  signalNavigationStart();
  router.replace(href);
}
