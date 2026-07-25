"use client";

import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type DotProps,
  type TooltipProps,
} from "recharts";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatIndicatorValue,
  TEAL_DOT,
  TEAL_LINE,
  type CategorySeriesPoint,
  type DeltaKind,
  type HealthSeriesPoint,
  type IndicatorDelta,
} from "@/lib/pacientes/health-indicator-series";
import { cn } from "@/lib/utils";

/** Quantos pontos cabem no card sem rolagem. */
const MAX_VISIBLE_POINTS = 5;
/** Largura mínima por avaliação no modo com scroll. */
const PX_PER_POINT = 44;
const SPARKLINE_HEIGHT = 96;
const CHART_MARGIN = { top: 8, right: 10, bottom: 22, left: 4 } as const;
const AXIS_TICK = { fontSize: 9, fill: "hsl(215 16% 57%)" };

const DELTA_ICON: Record<DeltaKind, ComponentType<SVGProps<SVGSVGElement>>> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const DELTA_CLASS: Record<DeltaKind, string> = {
  up: "text-primary",
  down: "text-primary",
  flat: "text-muted-foreground",
};

type NumericKpiProps = {
  kind: "numeric";
  label: string;
  code: string;
  tip: string;
  note: string;
  highlight?: boolean;
  delta: IndicatorDelta;
  series: HealthSeriesPoint[];
  unit: string;
  decimals: number;
  asInt?: boolean;
};

type CategoricalKpiProps = {
  kind: "categorical";
  label: string;
  code: string;
  tip: string;
  note: string;
  highlight?: boolean;
  delta: IndicatorDelta;
  series: CategorySeriesPoint[];
  colorForCategory: (category: string) => string;
};

export type HealthIndicatorKpiCardProps = NumericKpiProps | CategoricalKpiProps;

function lastNumericValue(series: HealthSeriesPoint[]): number | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const point = series[i];
    if (point.value != null) return point.value;
  }
  return null;
}

function lastCategory(series: CategorySeriesPoint[]): string {
  return series.length > 0 ? series[series.length - 1].category : "–";
}

function KpiTooltipIcon({ label, tip }: { label: string; tip: string }) {
  if (!tip) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`Sobre ${label}`}
        className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 opacity-60 outline-none transition-opacity hover:text-primary hover:opacity-100 focus-visible:opacity-100"
      >
        <Info className="size-3" aria-hidden />
      </TooltipTrigger>
      <TooltipContent
        className="max-w-56 border border-border bg-white text-left text-slate-700 shadow-lg [&_p]:text-slate-900"
        side="top"
      >
        <p className="mb-0.5 font-semibold text-slate-900">{label}</p>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function EmptySparkline() {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/25"
      style={{ height: SPARKLINE_HEIGHT }}
    >
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Sem avaliações
        <br />
        registradas ainda
      </p>
    </div>
  );
}

/** Fundo com elementos de design (grade, glow, base). */
function ChartStage({
  children,
  scrollable,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-teal-500/15",
        "bg-[linear-gradient(180deg,rgba(45,212,191,0.08)_0%,rgba(255,255,255,0.55)_42%,rgba(248,250,252,0.95)_100%)]",
        "dark:bg-[linear-gradient(180deg,rgba(45,212,191,0.12)_0%,rgba(15,23,42,0.35)_55%,rgba(15,23,42,0.55)_100%)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
      )}
    >
      {/* Grade decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(173 40% 80% / 0.35) 1px, transparent 1px), linear-gradient(to bottom, hsl(173 40% 80% / 0.28) 1px, transparent 1px)",
          backgroundSize: "18px 16px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 78%, transparent 100%)",
        }}
      />
      {/* Glow superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-full bg-teal-400/20 blur-2xl"
      />
      {/* Base sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-200/30 to-transparent dark:from-slate-900/40"
      />
      {scrollable ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-white/80 to-transparent dark:from-slate-950/50" />
      ) : null}
      {scrollable ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-white/70 to-transparent dark:from-slate-950/40" />
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function scrollToLatest(el: HTMLDivElement) {
  const max = el.scrollWidth - el.clientWidth;
  if (max > 0) el.scrollLeft = max;
}

function ChartScrollArea({
  pointCount,
  children,
}: {
  pointCount: number;
  children: (needsScroll: boolean, plotWidth: number | "100%") => ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const needsScroll = pointCount > MAX_VISIBLE_POINTS;
  const plotWidth = needsScroll ? pointCount * PX_PER_POINT : ("100%" as const);

  useLayoutEffect(() => {
    if (!needsScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => scrollToLatest(el);
    sync();
    const raf = requestAnimationFrame(sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [needsScroll, pointCount, plotWidth]);

  if (!needsScroll) {
    return <ChartStage>{children(false, "100%")}</ChartStage>;
  }

  return (
    <ChartStage scrollable>
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-400/40"
        aria-label="Histórico do indicador com rolagem horizontal — avaliação mais recente à direita"
      >
        <div style={{ width: plotWidth, minWidth: plotWidth, height: SPARKLINE_HEIGHT }}>
          {children(true, plotWidth)}
        </div>
      </div>
      <p className="px-2 pb-1 text-[10px] text-muted-foreground/80">
        Deslize → para ver o histórico completo
      </p>
    </ChartStage>
  );
}

type SparklineDotProps = DotProps & { index?: number; payload?: HealthSeriesPoint };

function NumericSparkline({
  series,
  unit,
  decimals,
  asInt,
}: Pick<NumericKpiProps, "series" | "unit" | "decimals" | "asInt">) {
  const hasData = series.some((point) => point.value != null);
  if (!hasData) return <EmptySparkline />;

  const lastIndex = series.length - 1;

  return (
    <ChartScrollArea pointCount={series.length}>
      {(needsScroll, plotWidth) => (
        <ResponsiveContainer
          width={typeof plotWidth === "number" ? plotWidth : "100%"}
          height={SPARKLINE_HEIGHT}
        >
          <LineChart data={series} margin={CHART_MARGIN}>
            <CartesianGrid
              stroke="hsl(173 35% 72% / 0.45)"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={needsScroll ? 0 : "preserveStartEnd"}
              minTickGap={needsScroll ? 8 : 16}
              height={18}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <RechartsTooltip
              isAnimationActive={false}
              cursor={{ stroke: "hsl(173 50% 55% / 0.35)", strokeWidth: 1 }}
              content={(props: TooltipProps<number, string>) => {
                if (!props.active || !props.payload?.length) return null;
                const point = props.payload[0]?.payload as HealthSeriesPoint | undefined;
                if (!point || point.value == null) return null;
                return (
                  <div className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-lg">
                    <p className="text-slate-500">{point.date}</p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {formatIndicatorValue(point.value, decimals, asInt)} {unit}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={TEAL_LINE}
              strokeWidth={2.25}
              isAnimationActive={false}
              connectNulls
              dot={(dotProps: SparklineDotProps) => {
                if (
                  dotProps.payload?.value == null ||
                  dotProps.cx == null ||
                  dotProps.cy == null
                ) {
                  return <g key={`dot-${dotProps.index ?? 0}`} />;
                }
                const isLast = dotProps.index === lastIndex;
                return (
                  <circle
                    key={`dot-${dotProps.index ?? 0}`}
                    cx={dotProps.cx}
                    cy={dotProps.cy}
                    r={isLast ? 4.5 : 3.5}
                    fill={isLast ? TEAL_DOT : "#ffffff"}
                    stroke={TEAL_DOT}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 5.5, fill: TEAL_DOT, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartScrollArea>
  );
}

function CategoricalHistory({
  series,
  colorForCategory,
}: Pick<CategoricalKpiProps, "series" | "colorForCategory">) {
  if (series.length === 0) return <EmptySparkline />;

  const lastIndex = series.length - 1;
  const data = series.map((point) => ({ ...point, level: 1 }));

  return (
    <ChartScrollArea pointCount={series.length}>
      {(needsScroll, plotWidth) => (
        <ResponsiveContainer
          width={typeof plotWidth === "number" ? plotWidth : "100%"}
          height={SPARKLINE_HEIGHT}
        >
          <BarChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid
              stroke="hsl(173 35% 72% / 0.4)"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={needsScroll ? 0 : "preserveStartEnd"}
              minTickGap={needsScroll ? 8 : 16}
              height={18}
            />
            <YAxis hide domain={[0, 1.4]} />
            <RechartsTooltip
              isAnimationActive={false}
              cursor={false}
              content={(props: TooltipProps<number, string>) => {
                if (!props.active || !props.payload?.length) return null;
                const point = props.payload[0]?.payload as CategorySeriesPoint | undefined;
                if (!point) return null;
                return (
                  <div className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-lg">
                    <p className="text-slate-500">{point.date}</p>
                    <p className="font-semibold text-slate-900">{point.category}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="level" radius={[6, 6, 3, 3]} maxBarSize={12} isAnimationActive={false}>
              {data.map((point, index) => (
                <Cell
                  key={point.iso}
                  fill={colorForCategory(point.category)}
                  fillOpacity={index === lastIndex ? 1 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartScrollArea>
  );
}

/**
 * Card de KPI de um indicador de saúde — valor atual, variação e histórico
 * (sparkline de linha para numéricos, barras coloridas para categóricos).
 */
export function HealthIndicatorKpiCard(props: HealthIndicatorKpiCardProps) {
  const { label, code, tip, note, highlight = false, delta } = props;
  const DeltaIcon = DELTA_ICON[delta.kind];

  return (
    <article
      className={cn(
        "flex min-h-[230px] flex-col rounded-2xl border bg-card px-4 pt-4 pb-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
        highlight ? "border-primary/25 bg-primary/[0.03]" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-foreground">
            {label}
          </span>
          <KpiTooltipIcon label={label} tip={tip} />
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          {code}
        </span>
      </div>

      {props.kind === "numeric" ? (
        <p className="mt-1 text-2xl leading-none font-bold tracking-tight tabular-nums text-foreground">
          {formatIndicatorValue(lastNumericValue(props.series), props.decimals, props.asInt)}{" "}
          <span className="text-sm font-medium text-muted-foreground">{props.unit}</span>
        </p>
      ) : (
        <p className="mt-1 text-lg leading-snug font-bold text-foreground">
          {lastCategory(props.series)}
        </p>
      )}

      <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", DELTA_CLASS[delta.kind])}>
        <DeltaIcon className="size-3.5" aria-hidden />
        {delta.text}
      </p>

      <div className="mt-2.5 flex-1">
        {props.kind === "numeric" ? (
          <NumericSparkline
            series={props.series}
            unit={props.unit}
            decimals={props.decimals}
            asInt={props.asInt}
          />
        ) : (
          <CategoricalHistory series={props.series} colorForCategory={props.colorForCategory} />
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground/80">{note}</p>
    </article>
  );
}
