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
        "space-y-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
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
  highlight = false,
}: {
  code?: string;
  label: string;
  value: string;
  unit: string;
  formula?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        highlight
          ? "border-primary/25 bg-primary/5"
          : "border-border/60 bg-background/80",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {label}
        </p>
        {code ? (
          <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal-800 dark:text-teal-200">
            {code}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums tracking-tight text-foreground">
        {value}{" "}
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {formula ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{formula}</p>
      ) : null}
    </div>
  );
}
