/** Opções de janela temporal dos gráficos do financeiro (meses civis no fuso do utilizador). */
export const CHART_PERIOD_MONTHS = [3, 6, 12, 24] as const;

export type ChartPeriodMonths = (typeof CHART_PERIOD_MONTHS)[number];

export function parseChartMonths(
  raw: string | undefined,
  fallback: ChartPeriodMonths = 6,
): ChartPeriodMonths {
  const n = Number.parseInt(raw ?? "", 10);
  return CHART_PERIOD_MONTHS.includes(n as ChartPeriodMonths)
    ? (n as ChartPeriodMonths)
    : fallback;
}

export function chartPeriodLabel(months: ChartPeriodMonths): string {
  return `${months} meses`;
}
