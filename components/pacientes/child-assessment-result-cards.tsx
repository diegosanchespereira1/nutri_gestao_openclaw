import {
  CHILD_COLOR_CLASSES,
  CHILD_INDICATOR_LABELS,
  CHILD_INDICATOR_UNIT,
} from "@/lib/nutrition/child/labels";
import type { ChildIndicatorResult } from "@/lib/nutrition/child/types";
import { cn } from "@/lib/utils";

function fmt(n: number | null, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

function fmtPercentile(r: ChildIndicatorResult): string {
  if (r.boundary === "below_p1") return "< P1";
  if (r.boundary === "above_p99") return "> P99";
  if (r.percentile == null) return "–";
  return `≈ P${Math.round(r.percentile)}`;
}

/** Faixa adequada em números, ex.: "Adequado: 14,2–24,3 kg" ou "≥ 100,6 cm". */
function adequateRange(r: ChildIndicatorResult): string | null {
  const unit = CHILD_INDICATOR_UNIT[r.indicator];
  if (r.adequateLow != null && r.adequateHigh != null) {
    return `Adequado: ${fmt(r.adequateLow)}–${fmt(r.adequateHigh)} ${unit}`;
  }
  if (r.adequateLow != null) {
    return `Adequado: ≥ ${fmt(r.adequateLow)} ${unit}`;
  }
  return null;
}

function Card({ result }: { result: ChildIndicatorResult }) {
  const label = CHILD_INDICATOR_LABELS[result.indicator];
  const unit = CHILD_INDICATOR_UNIT[result.indicator];

  if (result.outOfRange) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fora da faixa de referência
        </p>
      </div>
    );
  }

  if (!result.classification || !result.color) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Sem dados</p>
      </div>
    );
  }

  const range = adequateRange(result);

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", CHILD_COLOR_CLASSES[result.color])}>
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-tight">
        {result.classification}
      </p>
      <p className="mt-0.5 font-mono text-xs tabular-nums opacity-90">
        {result.value != null ? `${fmt(result.value)} ${unit} · ` : ""}
        {fmtPercentile(result)}
      </p>
      {range && (
        <p className="mt-1 text-[11px] leading-snug opacity-70">{range}</p>
      )}
    </div>
  );
}

export function ChildAssessmentResultCards({
  indicators,
}: {
  indicators: ChildIndicatorResult[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {indicators.map((r) => (
        <Card key={r.indicator} result={r} />
      ))}
    </div>
  );
}
