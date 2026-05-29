"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type GeneralChartPoint = {
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
};

export type AnthroChartPoint = {
  date: string;
  bmi: number | null;
  estimated_weight_kg: number | null;
  energy_needs_kcal: number | null;
  protein_needs_g: number | null;
};

type MetricConfig = {
  dataKey: string;
  unit: string;
  color: string;
  refLines?: Array<{ y: number; color: string }>;
  tickFmt?: (v: number) => string;
};

function fmtNum(v: number, decimals = 1) {
  return v.toFixed(decimals).replace(".", ",");
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry || entry.value == null) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-1.5 shadow-lg text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p style={{ color: String(entry.color) }} className="font-semibold tabular-nums">
        {fmtNum(Number(entry.value))} {unit}
      </p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground px-3">
        Mínimo 2 avaliações<br />para exibir gráfico
      </p>
    </div>
  );
}

function MiniChart({
  data,
  config,
}: {
  data: Record<string, unknown>[];
  config: MetricConfig;
}) {
  const validCount = data.filter((d) => d[config.dataKey] != null).length;
  if (validCount < 2) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={148}>
      <LineChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#94a3b8"
          opacity={0.15}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={34}
          tickFormatter={config.tickFmt ?? ((v: number) => fmtNum(v, 0))}
        />
        {config.refLines?.map((ref) => (
          <ReferenceLine
            key={ref.y}
            y={ref.y}
            stroke={ref.color}
            strokeDasharray="4 3"
            strokeWidth={1}
            opacity={0.55}
          />
        ))}
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => (
            <ChartTooltip {...props} unit={config.unit} />
          )}
        />
        <Line
          type="monotone"
          dataKey={config.dataKey}
          stroke={config.color}
          strokeWidth={2.5}
          dot={
            data.length <= 10
              ? { r: 3.5, fill: config.color, strokeWidth: 0 }
              : false
          }
          activeDot={{ r: 5, fill: config.color, strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartTile({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

export function GeneralEvolutionCharts({ data }: { data: GeneralChartPoint[] }) {
  const d = data as Record<string, unknown>[];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChartTile title="Peso (kg)">
        <MiniChart
          data={d}
          config={{ dataKey: "weight_kg", unit: "kg", color: "#3b82f6" }}
        />
      </ChartTile>
      <ChartTile title="Cintura (cm)">
        <MiniChart
          data={d}
          config={{ dataKey: "waist_cm", unit: "cm", color: "#f97316" }}
        />
      </ChartTile>
    </div>
  );
}

export function AnthroEvolutionCharts({ data }: { data: AnthroChartPoint[] }) {
  const d = data as Record<string, unknown>[];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChartTile title="IMC (kg/m²)">
        <MiniChart
          data={d}
          config={{
            dataKey: "bmi",
            unit: "kg/m²",
            color: "#8b5cf6",
            refLines: [
              { y: 18.5, color: "#f59e0b" },
              { y: 25, color: "#22c55e" },
              { y: 30, color: "#ef4444" },
            ],
          }}
        />
      </ChartTile>
      <ChartTile title="Peso Estimado (kg)">
        <MiniChart
          data={d}
          config={{ dataKey: "estimated_weight_kg", unit: "kg", color: "#3b82f6" }}
        />
      </ChartTile>
      <ChartTile title="Energia Necessária (kcal/dia)">
        <MiniChart
          data={d}
          config={{
            dataKey: "energy_needs_kcal",
            unit: "kcal",
            color: "#ef4444",
            tickFmt: (v) => Math.round(v).toLocaleString("pt-BR"),
          }}
        />
      </ChartTile>
      <ChartTile title="Proteína Necessária (g/dia)">
        <MiniChart
          data={d}
          config={{ dataKey: "protein_needs_g", unit: "g", color: "#22c55e" }}
        />
      </ChartTile>
    </div>
  );
}
