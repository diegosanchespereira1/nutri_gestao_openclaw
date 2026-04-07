/**
 * Padrão visual dos gráficos financeiros (NutriGestão)
 * ----------------------------------------------------
 * Princípios (design centrado no utilizador):
 * - **Clareza imediata**: cada métrica tem cor fixa e semântica (entrada de dinheiro ≠ fluxo de lançamento ≠ risco).
 * - **Contraste**: paleta testada em fundo claro (cartões `bg-white`) para leitura rápida e acessibilidade percebida.
 * - **Consistência**: mesmas escolhas em todos os gráficos do módulo; tooltips e eixos partilham o shell em `financial-chart-shell.tsx`.
 *
 * Não usar rotação de `--chart-n` por barra em séries temporais únicas — cor única reforça “uma métrica, uma leitura”.
 */

/** Recebido (valor liquidado) — verde firme */
export const FIN_CHART_RECEIVED_FILL = "#059669";

/** Lançado no mês (novas cobranças) — âmbar/laranja (distinto do verde “dinheiro recebido”) */
export const FIN_CHART_ISSUED_FILL = "#ea580c";

/** Recebido no mesmo mês (fluxo) — azul */
export const FIN_CHART_PAID_IN_MONTH_FILL = "#2563eb";

/** Barras horizontais de inadimplência — tons quentes distintos por posição (ranking) */
export const FIN_CHART_OVERDUE_RANK_FILLS = [
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#854d0e",
  "#7c2d12",
] as const;

export function finChartOverdueFill(rankIndex0: number): string {
  const i =
    ((rankIndex0 % FIN_CHART_OVERDUE_RANK_FILLS.length) +
      FIN_CHART_OVERDUE_RANK_FILLS.length) %
    FIN_CHART_OVERDUE_RANK_FILLS.length;
  return FIN_CHART_OVERDUE_RANK_FILLS[i]!;
}
