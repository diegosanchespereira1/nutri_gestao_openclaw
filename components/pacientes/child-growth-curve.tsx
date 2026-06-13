"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getReference } from "@/lib/nutrition/child/reference";
import { valueForPercentile } from "@/lib/nutrition/child/percentile";
import {
  CHILD_INDICATOR_LABELS,
  CHILD_INDICATOR_SHORT,
} from "@/lib/nutrition/child/labels";
import type {
  ChildIndicator,
  ChildSex,
  ClassificationMethod,
} from "@/lib/nutrition/child/types";

type CurvePoint = {
  age: number;
  p3: number | null;
  p15: number | null;
  p50: number | null;
  p85: number | null;
  p97: number | null;
};

const LINES: Array<{ key: keyof CurvePoint; label: string; color: string; dash?: string }> = [
  { key: "p97", label: "P97", color: "#ef4444", dash: "4 3" },
  { key: "p85", label: "P85", color: "#f59e0b", dash: "4 3" },
  { key: "p50", label: "P50", color: "#10b981" },
  { key: "p15", label: "P15", color: "#f59e0b", dash: "4 3" },
  { key: "p3", label: "P3", color: "#ef4444", dash: "4 3" },
];

const UNIT: Record<ChildIndicator, string> = {
  weight_for_age: "kg",
  height_for_age: "cm",
  bmi_for_age: "kg/m²",
  weight_for_height: "kg",
};

function buildData(
  indicator: ChildIndicator,
  sex: ChildSex,
  method: ClassificationMethod,
  centerAge: number,
): CurvePoint[] {
  const span = indicator === "bmi_for_age" || indicator === "height_for_age" ? 18 : 12;
  const lo = Math.max(0, centerAge - span);
  const hi = centerAge + span;
  const out: CurvePoint[] = [];
  for (let age = lo; age <= hi; age++) {
    const row = getReference(indicator, sex, age, method);
    if (!row) continue;
    out.push({
      age,
      p3: valueForPercentile("p3", row),
      p15: valueForPercentile("p15", row),
      p50: valueForPercentile("p50", row),
      p85: valueForPercentile("p85", row),
      p97: valueForPercentile("p97", row),
    });
  }
  return out;
}

export function ChildGrowthCurve({
  indicator,
  sex,
  ageMonths,
  value,
  method,
}: {
  indicator: ChildIndicator;
  sex: ChildSex;
  ageMonths: number;
  value: number | null;
  method: ClassificationMethod;
}) {
  const data = buildData(indicator, sex, method, ageMonths);

  if (data.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
        <p className="px-3 text-center text-[11px] text-muted-foreground">
          Sem curva de referência para esta idade
        </p>
      </div>
    );
  }

  const childPoint = value != null ? [{ age: ageMonths, value }] : [];

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-foreground">
        {CHILD_INDICATOR_SHORT[indicator]} · {CHILD_INDICATOR_LABELS[indicator]}
        <span className="ml-1 font-normal text-muted-foreground">({UNIT[indicator]})</span>
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="2 2" className="stroke-border" />
          <XAxis
            dataKey="age"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 10 }}
            tickFormatter={(m: number) => `${Math.round(m / 12)}a`}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={42}
            stroke="currentColor"
            className="text-muted-foreground"
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              typeof v === "number" ? v.toFixed(1).replace(".", ",") : v,
              name,
            ]}
            labelFormatter={(m: number) =>
              `${Math.floor(m / 12)}a ${m % 12}m`
            }
            contentStyle={{ fontSize: 12 }}
          />
          {LINES.map((l) => (
            <Line
              key={l.key as string}
              type="monotone"
              dataKey={l.key as string}
              name={l.label}
              stroke={l.color}
              strokeWidth={1.5}
              strokeDasharray={l.dash}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
          {childPoint.length > 0 && (
            <>
              <Scatter
                data={childPoint}
                dataKey="value"
                fill="#0ea5e9"
                isAnimationActive={false}
              />
              <ReferenceDot
                x={ageMonths}
                y={value as number}
                r={5}
                fill="#0ea5e9"
                stroke="#fff"
                strokeWidth={1.5}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
