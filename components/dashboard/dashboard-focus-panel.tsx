import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "clinical" | "financial";

const toneClass: Record<Tone, string> = {
  clinical:
    "border-border rounded-xl border bg-white shadow-xs dark:bg-card",
  financial:
    "border-border border-l-amber-600/80 bg-amber-500/[0.06] dark:border-l-amber-500/80 dark:bg-amber-950/25 border-y border-r border-l-4 rounded-r-xl",
};

type Props = {
  /** Valor único para `aria-labelledby`. */
  labelledById: string;
  title: string;
  description?: string;
  tone: Tone;
  children: ReactNode;
};

/**
 * Painel do *dashboard* com hierarquia visual própria (épico 5 / FR53).
 */
export function DashboardFocusPanel({
  labelledById,
  title,
  description,
  tone,
  children,
}: Props) {
  return (
    <section
      className={cn("px-4 py-5 sm:px-5 sm:py-6", toneClass[tone])}
      aria-labelledby={labelledById}
    >
      <header className="mb-5 space-y-1 border-b border-border/60 pb-4">
        <h2
          id={labelledById}
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </header>
      <div className="space-y-8">{children}</div>
    </section>
  );
}
