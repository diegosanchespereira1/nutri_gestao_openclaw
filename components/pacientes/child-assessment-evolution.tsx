"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="2 2" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10 }}
            width={32}
            stroke="currentColor"
            className="text-muted-foreground"
            tickFormatter={(v: number) => `P${v}`}
          />
          <Tooltip
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
      </ResponsiveContainer>
    </div>
  );
}
