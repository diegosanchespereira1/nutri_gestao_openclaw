export type FinanceiroTabValue = "resumo" | "operacoes";

/**
 * `tab` explícito ganha; senão, contexto de filtros/erro abre em «Cobranças e registos».
 */
export function resolveFinanceiroInitialTab(
  tabRaw: string | undefined,
  hasOperacoesBump: boolean,
): FinanceiroTabValue {
  if (tabRaw === "resumo") return "resumo";
  if (tabRaw === "operacoes") return "operacoes";
  return hasOperacoesBump ? "operacoes" : "resumo";
}
