"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { finChartOverdueFill } from "@/lib/financeiro/financial-charts-visual";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
import type { FinancialTopOverdueRow } from "@/lib/financeiro/financial-chart-series";

function axisTickBRL(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1000) return `${(reais / 1000).toFixed(0)}k`;
  return String(Math.round(reais));
}

type Props = {
  data: FinancialTopOverdueRow[];
};

export function FinancialTopOverdueBarChart({ data }: Props) {
  return (
    <FinancialChartShell
      heightClassName="h-[min(280px,24rem)]"
      minHeightClassName="min-h-[160px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={finChartGridStroke}
            opacity={0.6}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: finChartAxisTickFill }}
            tickLine={{ stroke: finChartAxisLineStroke }}
            axisLine={{ stroke: finChartAxisLineStroke }}
            tickFormatter={(v) => axisTickBRL(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 10, fill: finChartAxisTickFill }}
            tickLine={{ stroke: finChartAxisLineStroke }}
            axisLine={{ stroke: finChartAxisLineStroke }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.25 }}
            contentStyle={finChartTooltipContentStyle}
            formatter={(value) => [
              formatBRLFromCents(Number(value) || 0),
              "Em atraso",
            ]}
          />
          <Bar
            dataKey="overdueCents"
            name="Em atraso"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          >
            {data.map((row, i) => (
              <Cell key={row.clientId} fill={finChartOverdueFill(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </FinancialChartShell>
  );
}
