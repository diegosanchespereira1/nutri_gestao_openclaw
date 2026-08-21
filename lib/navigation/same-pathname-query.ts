/**
 * Navegação que só altera a query string (busca, filtros, paginação, abas).
 * Não deve disparar o overlay global com logo — a página já tem skeleton local.
 */
export function isSamePathnameNavigation(
  href: string,
  currentHref: string,
): boolean {
  try {
    const dest = new URL(href, currentHref);
    const current = new URL(currentHref);
    return dest.pathname === current.pathname;
  } catch {
    return false;
  }
}
