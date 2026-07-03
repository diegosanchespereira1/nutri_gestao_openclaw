"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  EvolutionChartScrollShell,
  evolutionXAxisProps,
} from "@/components/pacientes/assessment-evolution-charts";

export type ChildEvolutionPoint = {
  date: string;
  weight_for_age: number | null;
  height_for_age: number | null;
  bmi_for_age: number | null;
};

const SERIES: Array<{ key: keyof ChildEvolutionPoint; label: string; color: string }> = [
  { key: "bmi_for_age", label: "IMC/I", color: "#0ea5e9" },
  { key: "weight_for_age", label: "P/I", color: "#10b981" },
  { key: "height_for_age", label: "E/I", color: "#a855f7" },
];

const CHILD_CHART_HEIGHT = 228;
const Y_AXIS_WIDTH = 40;
const CHART_MARGIN = { top: 8, right: 12, bottom: 44, left: 4 } as const;
const AXIS_TICK_STYLE = { fontSize: 10, fill: "#64748b" };
const Y_DOMAIN: [number, number] = [0, 100];

function ChildYAxisPanel({ data, height }: { data: ChildEvolutionPoint[]; height: number }) {
  return (
    <div
      className="bg-card shrink-0 border-r border-border/40 pr-0.5"
      style={{ width: Y_AXIS_WIDTH }}
    >
      <LineChart width={Y_AXIS_WIDTH} height={height} data={data} margin={CHART_MARGIN}>
        <XAxis hide />
        <YAxis
          domain={Y_DOMAIN}
          ticks={[0, 25, 50, 75, 100]}
          tick={AXIS_TICK_STYLE}
          width={Y_AXIS_WIDTH - 6}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `P${v}`}
        />
        <Line
          type="monotone"
          dataKey="bmi_for_age"
          stroke="transparent"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}

export function ChildAssessmentEvolution({ data }: { data: ChildEvolutionPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
        <p className="text-center text-[11px] text-muted-foreground">
          Mínimo 2 avaliações
          <br />
          para exibir a evolução
        </p>
      </div>
    );
  }

  const renderPlot = (scrolling: boolean) => (
    <LineChart
      data={data}
      margin={{
        ...CHART_MARGIN,
        left: scrolling ? CHART_MARGIN.left : -12,
      }}
    >
      <CartesianGrid strokeDasharray="2 2" className="stroke-border" />
      <XAxis {...evolutionXAxisProps(data.length, scrolling)} />
      <YAxis
        domain={Y_DOMAIN}
        hide={scrolling}
        ticks={[0, 25, 50, 75, 100]}
        tick={AXIS_TICK_STYLE}
        width={scrolling ? 1 : Y_AXIS_WIDTH - 6}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v: number) => `P${v}`}
      />
      <Tooltip
        labelFormatter={(_, items) => {
          const row = items?.[0]?.payload as { date?: string } | undefined;
          return row?.date ?? _;
        }}
        formatter={(v: number, name: string) => [
          v == null ? "–" : `P${Math.round(v)}`,
          name,
        ]}
        contentStyle={{ fontSize: 12 }}
      />
      {SERIES.map((s) => (
        <Line
          key={s.key as string}
          type="monotone"
          dataKey={s.key as string}
          name={s.label}
          stroke={s.color}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
          connectNulls
        />
      ))}
    </LineChart>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key as string} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <EvolutionChartScrollShell
        pointCount={data.length}
        height={CHILD_CHART_HEIGHT}
        yAxisPanel={<ChildYAxisPanel data={data} height={CHILD_CHART_HEIGHT} />}
        plotChart={renderPlot}
      />
    </div>
  );
}
