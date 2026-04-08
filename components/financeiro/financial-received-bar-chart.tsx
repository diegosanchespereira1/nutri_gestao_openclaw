"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { FIN_CHART_RECEIVED_FILL } from "@/lib/financeiro/financial-charts-visual";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
import type { FinancialReceivedMonthBucket } from "@/lib/financeiro/financial-chart-series";

function axisTickBRL(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1_000_000) return `${(reais / 1_000_000).toFixed(1)}M`;
  if (reais >= 1000) return `${(reais / 1000).toFixed(0)}k`;
  return String(Math.round(reais));
}

type Props = {
  data: FinancialReceivedMonthBucket[];
};

export function FinancialReceivedBarChart({ data }: Props) {
  return (
    <FinancialChartShell>
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
            formatter={(value) => [
              formatBRLFromCents(Number(value) || 0),
              "Recebido",
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as
                | FinancialReceivedMonthBucket
                | undefined;
              return row?.label ?? "";
            }}
          />
          <Bar
            dataKey="receivedCents"
            name="Recebido"
            fill={FIN_CHART_RECEIVED_FILL}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </FinancialChartShell>
  );
}
