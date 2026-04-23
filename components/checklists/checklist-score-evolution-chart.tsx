"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScoreHistoryPoint } from "@/lib/actions/checklist-history";
import { cn } from "@/lib/utils";

/* ─── helpers ────────────────────────────────────────────────────────────── */

/** Formata ISO → "DD/MM/YY HH:MM". */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function classLabel(pct: number): { text: string; color: string } {
  if (pct >= 90) return { text: "Excelente", color: "#16a34a" };
  if (pct >= 75) return { text: "Bom", color: "#2563eb" };
  if (pct >= 50) return { text: "Regular", color: "#d97706" };
  return { text: "Crítico", color: "#dc2626" };
}

const LINE_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

/* ─── tooltip customizado ────────────────────────────────────────────────── */

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    color: string;
    name: string;
    value: number;
    payload: { date: string; areaLabel: string };
  }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md text-xs space-y-1 max-w-[240px]">
      <p className="font-semibold text-foreground">{payload[0]?.payload.date}</p>
      {payload[0]?.payload.areaLabel ? (
        <p className="text-muted-foreground">📍 {payload[0]?.payload.areaLabel}</p>
      ) : null}
      {payload.map((entry) => {
        const { text, color } = classLabel(entry.value);
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="size-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-muted-foreground truncate">{entry.name}:</span>
            <span className="font-bold tabular-nums" style={{ color }}>
              {entry.value}% · {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── props ──────────────────────────────────────────────────────────────── */

type TemplateGroup = {
  templateId: string;
  templateName: string;
  points: ScoreHistoryPoint[];
};

type Props = {
  byTemplate: TemplateGroup[];
  className?: string;
};

/* ─── componente principal ───────────────────────────────────────────────── */

export function ChecklistScoreEvolutionChart({ byTemplate, className }: Props) {
  if (byTemplate.length === 0 || byTemplate.every((g) => g.points.length === 0)) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-xl border border-dashed p-6 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          Nenhum checklist aprovado com pontuação disponível ainda.
        </p>
      </div>
    );
  }

  // Collect all unique dates (x-axis), sorted
  const allDatesSet = new Set<string>();
  for (const g of byTemplate) {
    for (const p of g.points) allDatesSet.add(p.approvedAt);
  }
  const allDates = Array.from(allDatesSet).sort();

  // Build chart rows: one row per date, one key per template
  const chartData = allDates.map((date) => {
    const row: Record<string, unknown> = {
      date: fmtDate(date),
      rawDate: date,
      areaLabel: "",
    };
    for (const g of byTemplate) {
      const pt = g.points.find((p) => p.approvedAt === date);
      if (pt !== undefined) {
        row[g.templateId] = Math.round(pt.scorePercentage);
        if (pt.areaName) row.areaLabel = pt.areaName;
      }
    }
    return row;
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Classification legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(
          [
            { label: "Excelente", range: "≥90%", color: "bg-green-500" },
            { label: "Bom", range: "75–89%", color: "bg-blue-500" },
            { label: "Regular", range: "50–74%", color: "bg-amber-500" },
            { label: "Crítico", range: "<50%", color: "bg-red-500" },
          ] as const
        ).map(({ label, range, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full shrink-0", color)} />
            {label} ({range})
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickCount={6}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          {/* Classification reference lines */}
          <ReferenceLine y={90} stroke="#16a34a" strokeDasharray="4 3" strokeOpacity={0.4} />
          <ReferenceLine y={75} stroke="#2563eb" strokeDasharray="4 3" strokeOpacity={0.4} />
          <ReferenceLine y={50} stroke="#d97706" strokeDasharray="4 3" strokeOpacity={0.4} />
          <Tooltip content={<CustomTooltip />} />
          {byTemplate.length > 1 ? (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value: string) => {
                const g = byTemplate.find((t) => t.templateId === value);
                return g?.templateName ?? value;
              }}
            />
          ) : null}
          {byTemplate.map((g, i) => (
            <Line
              key={g.templateId}
              type="monotone"
              dataKey={g.templateId}
              name={g.templateId}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
