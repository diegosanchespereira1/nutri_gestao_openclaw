"use client";

import type { CSSProperties, ReactNode } from "react";

/** Estilos partilhados Recharts: grelha, eixos e tooltip (padrão do módulo financeiro). */
export const finChartGridStroke = "var(--border)";
export const finChartAxisTickFill = "var(--muted-foreground)";
export const finChartAxisLineStroke = "var(--border)";

export const finChartTooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  fontSize: "12px",
  color: "var(--card-foreground)",
};

type Props = {
  heightClassName?: string;
  minHeightClassName?: string;
  children: ReactNode;
};

export function FinancialChartShell({
  heightClassName = "h-[240px]",
  minHeightClassName = "min-h-[200px]",
  children,
}: Props) {
  return (
    <div
      className={`text-card-foreground w-full min-w-0 ${heightClassName} ${minHeightClassName}`}
    >
      {children}
    </div>
  );
}
