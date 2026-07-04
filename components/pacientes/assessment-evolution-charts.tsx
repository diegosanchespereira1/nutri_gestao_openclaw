"use client";

import { useLayoutEffect, useRef, type ReactElement } from "react";

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

/** Máximo de avaliações visíveis no viewport; acima disso, rolagem lateral. */
export const EVOLUTION_CHART_MAX_VISIBLE = 10;

/** Largura mínima (px) por ponto — cabe dd/mm/yy em 10px sem colisão. */
export const EVOLUTION_CHART_PX_PER_POINT = 72;

const Y_AXIS_WIDTH = 40;
const MINI_CHART_HEIGHT = 176;
const CHART_MARGIN = { top: 8, right: 8, bottom: 44, left: 4 } as const;
const AXIS_TICK_STYLE = { fontSize: 10, fill: "#64748b" };

export function evolutionXAxisProps(pointCount: number, scrolling: boolean) {
  const useScrollLayout =
    scrolling || pointCount > EVOLUTION_CHART_MAX_VISIBLE;

  if (useScrollLayout) {
    return {
      dataKey: "date" as const,
      tick: AXIS_TICK_STYLE,
      axisLine: { stroke: "#cbd5e1" },
      tickLine: false,
      interval: 0 as const,
      minTickGap: 14,
      tickMargin: 6,
      height: 40,
    };
  }

  if (pointCount > 7) {
    return {
      dataKey: "date" as const,
      tick: AXIS_TICK_STYLE,
      axisLine: { stroke: "#cbd5e1" },
      tickLine: false,
      interval: 1 as const,
      minTickGap: 22,
      tickMargin: 8,
      height: 36,
    };
  }

  return {
    dataKey: "date" as const,
    tick: AXIS_TICK_STYLE,
    axisLine: { stroke: "#cbd5e1" },
    tickLine: false,
    interval: "preserveStartEnd" as const,
    minTickGap: 22,
    tickMargin: 8,
    height: 36,
  };
}

function computeNumericDomain(
  data: Record<string, unknown>[],
  dataKey: string,
  refLines?: Array<{ y: number }>,
): [number, number] {
  const values = data
    .map((row) => row[dataKey])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const refYs = refLines?.map((r) => r.y) ?? [];
  const all = [...values, ...refYs];
  if (all.length === 0) return [0, 1];

  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
  }
  return [min, max];
}

function FixedYAxisPanel({
  data,
  dataKey,
  domain,
  height,
  tickFormatter,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  domain: [number, number];
  height: number;
  tickFormatter?: (v: number) => string;
}) {
  return (
    <div
      className="bg-card shrink-0 border-r border-border/40 pr-0.5"
      style={{ width: Y_AXIS_WIDTH }}
    >
      <ResponsiveContainer width={Y_AXIS_WIDTH} height={height}>
        <LineChart data={data} margin={CHART_MARGIN}>
          <XAxis hide />
          <YAxis
            domain={domain}
            tick={AXIS_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={Y_AXIS_WIDTH - 6}
            tickFormatter={tickFormatter ?? ((v: number) => String(Math.round(v)))}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="transparent"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function scrollChartToLatest(scrollEl: HTMLDivElement) {
  const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
  if (maxScroll > 0) {
    scrollEl.scrollLeft = maxScroll;
  }
}

export function EvolutionChartScrollShell({
  pointCount,
  height,
  yAxisPanel,
  plotChart,
}: {
  pointCount: number;
  height: number;
  yAxisPanel: React.ReactNode;
  plotChart: (needsScroll: boolean) => ReactElement;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const needsScroll = pointCount > EVOLUTION_CHART_MAX_VISIBLE;
  const plotMinWidth = pointCount * EVOLUTION_CHART_PX_PER_POINT;

  useLayoutEffect(() => {
    if (!needsScroll) return;
    const el = scrollRef.current;
    if (!el) return;

    const syncScroll = () => scrollChartToLatest(el);

    syncScroll();
    const rafId = requestAnimationFrame(syncScroll);

    const resizeObserver = new ResizeObserver(syncScroll);
    resizeObserver.observe(el);
    if (el.firstElementChild instanceof Element) {
      resizeObserver.observe(el.firstElementChild);
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          syncScroll();
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [needsScroll, pointCount, plotMinWidth]);

  if (!needsScroll) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        {plotChart(false)}
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex w-full">
      {yAxisPanel}
      <div
        ref={scrollRef}
        className="min-w-0 flex-1 overflow-x-auto overflow-y-visible overscroll-x-contain"
        aria-label="Gráfico com rolagem horizontal — avaliação mais recente à direita"
      >
        <div style={{ minWidth: plotMinWidth, width: plotMinWidth, height }}>
          <ResponsiveContainer width="100%" height={height}>
            {plotChart(true)}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

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

  const row = entry.payload as { date?: string } | undefined;
  const displayDate = row?.date ?? label;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-1.5 shadow-lg text-xs">
      <p className="text-foreground/70 mb-0.5">{displayDate}</p>
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

  const domain = computeNumericDomain(data, config.dataKey, config.refLines);
  const yTickFormatter =
    config.tickFmt ?? ((v: number) => fmtNum(v, 0));

  const renderPlot = (scrolling: boolean) => (
    <LineChart
      data={data}
      margin={{
        ...CHART_MARGIN,
        left: scrolling ? CHART_MARGIN.left : -14,
      }}
    >
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="#94a3b8"
        opacity={0.15}
        vertical={false}
      />
      <XAxis {...evolutionXAxisProps(data.length, scrolling)} />
      <YAxis
        domain={domain}
        hide={scrolling}
        tick={AXIS_TICK_STYLE}
        axisLine={false}
        tickLine={false}
        width={scrolling ? 1 : Y_AXIS_WIDTH - 6}
        tickFormatter={yTickFormatter}
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
        dot={{ r: 3.5, fill: config.color, strokeWidth: 0 }}
        activeDot={{ r: 5, fill: config.color, strokeWidth: 0 }}
        connectNulls={false}
      />
    </LineChart>
  );

  return (
    <EvolutionChartScrollShell
      pointCount={data.length}
      height={MINI_CHART_HEIGHT}
      yAxisPanel={
        <FixedYAxisPanel
          data={data}
          dataKey={config.dataKey}
          domain={domain}
          height={MINI_CHART_HEIGHT}
          tickFormatter={yTickFormatter}
        />
      }
      plotChart={renderPlot}
    />
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
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
