type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeNavigationStart(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Dispara o loading padrão antes de `router.push` / `router.replace`. */
export function signalNavigationStart(): void {
  listeners.forEach((listener) => listener());
}

export function pushWithLoading(
  router: { push: (href: string) => void },
  href: string,
): void {
  signalNavigationStart();
  router.push(href);
}
