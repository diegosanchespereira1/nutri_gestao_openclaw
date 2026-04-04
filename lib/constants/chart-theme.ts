/**
 * Índices dos tokens CSS `--chart-1` … `--chart-5` (globals + temas Nutri).
 * Usados em gráficos (Recharts) via `fill: var(--chart-n)`.
 */
export const CHART_TOKEN_COUNT = 5 as const;

export function chartCssVar(index1Based: number): string {
  const i = Math.min(
    Math.max(index1Based, 1),
    CHART_TOKEN_COUNT,
  );
  return `var(--chart-${i})`;
}
