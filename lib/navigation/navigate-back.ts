type NavigateBackRouter = {
  back: () => void;
  push: (href: string) => void;
};

/** Volta à página anterior no histórico; se não houver, usa o fallback. */
export function navigateBack(
  router: NavigateBackRouter,
  fallbackHref: string,
): void {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}
