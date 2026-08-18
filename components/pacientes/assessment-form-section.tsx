import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Secção visual premium para formulários de avaliação especializada.
 * Não altera lógica — só layout (cards glass / tipografia).
 */
export function AssessmentFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <header className="space-y-0.5">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Chip de valor calculado (read-only) — estilo dashboard B. */
export function AssessmentCalcChip({
  code,
  label,
  value,
  unit,
  formula,
  hint,
  highlight = false,
}: {
  code?: string;
  label: string;
  value: string;
  unit: string;
  formula?: string;
  hint?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3",
        highlight
          ? "border-primary/25 bg-primary/5"
          : "border-border/60 bg-background/80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
          {label}
        </p>
        {code ? (
          <span className="shrink-0 rounded-md border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-teal-800 dark:text-teal-200">
            {code}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
        {value}{" "}
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {formula ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          {formula}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Percentil ao vivo abaixo de um campo antropométrico. */
export function AnthroPercentileHint({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{text}</p>
  );
}
