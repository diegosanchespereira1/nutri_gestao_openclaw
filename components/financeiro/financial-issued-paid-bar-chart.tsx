"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  FinancialChartShell,
  finChartAxisLineStroke,
  finChartAxisTickFill,
  finChartGridStroke,
  finChartTooltipContentStyle,
} from "@/components/financeiro/financial-chart-shell";
import {
  FIN_CHART_ISSUED_FILL,
  FIN_CHART_PAID_IN_MONTH_FILL,
} from "@/lib/financeiro/financial-charts-visual";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
import type { FinancialIssuedPaidMonthBucket } from "@/lib/financeiro/financial-chart-series";

function axisTickBRL(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1_000_000) return `${(reais / 1_000_000).toFixed(1)}M`;
  if (reais >= 1000) return `${(reais / 1000).toFixed(0)}k`;
  return String(Math.round(reais));
}

type Props = {
  data: FinancialIssuedPaidMonthBucket[];
};

export function FinancialIssuedPaidBarChart({ data }: Props) {
  return (
    <FinancialChartShell
      heightClassName="h-[260px]"
      minHeightClassName="min-h-[200px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={finChartGridStroke}
            opacity={0.6}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: finChartAxisTickFill }}
            tickLine={{ stroke: finChartAxisLineStroke }}
            axisLine={{ stroke: finChartAxisLineStroke }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={52}
          />
          <YAxis
            width={44}
            tick={{ fontSize: 10, fill: finChartAxisTickFill }}
            tickLine={{ stroke: finChartAxisLineStroke }}
            axisLine={{ stroke: finChartAxisLineStroke }}
            tickFormatter={(v) => axisTickBRL(Number(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            contentStyle={finChartTooltipContentStyle}
            formatter={(value, name) => [
              formatBRLFromCents(Number(value) || 0),
              name === "paidCents" ? "Recebido no mês" : "Lançado no mês",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) =>
              value === "paidCents" ? "Recebido no mês" : "Lançado no mês"
            }
          />
          <Bar
            dataKey="paidCents"
            name="paidCents"
            fill={FIN_CHART_PAID_IN_MONTH_FILL}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="issuedCents"
            name="issuedCents"
            fill={FIN_CHART_ISSUED_FILL}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </FinancialChartShell>
  );
}
