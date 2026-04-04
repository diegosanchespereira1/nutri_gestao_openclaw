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

import { chartCssVar, CHART_TOKEN_COUNT } from "@/lib/constants/chart-theme";
import type { VisitsByMonthBucket } from "@/lib/dashboard/visits-by-month";

type Props = {
  data: VisitsByMonthBucket[];
};

/**
 * Barras com `fill: var(--chart-*)` para cumprir UX-DR16 / story 5.6.
 */
export function VisitsMonthBarChart({ data }: Props) {
  return (
    <div className="text-card-foreground h-[240px] w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.6}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={52}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "12px",
              color: "var(--card-foreground)",
            }}
            formatter={(value) => [
              typeof value === "number" ? value : Number(value) || 0,
              "Visitas",
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as
                | VisitsByMonthBucket
                | undefined;
              return row?.label ?? "";
            }}
          />
          <Bar dataKey="count" name="Visitas" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((row, i) => (
              <Cell
                key={row.monthKey}
                fill={chartCssVar((i % CHART_TOKEN_COUNT) + 1)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
