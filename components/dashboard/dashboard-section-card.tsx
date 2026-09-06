import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DashboardSectionTone = "default" | "urgent" | "financial";

type Props = {
  id: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: DashboardSectionTone;
  children: ReactNode;
};

export function DashboardSectionCard({
  id,
  title,
  description,
  actions,
  tone = "default",
  children,
}: Props) {
  const toneClass =
    tone === "urgent"
      ? "border-l-4 border-l-destructive"
      : tone === "financial"
        ? "border-l-4 border-l-amber-600/80"
        : "";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "border-border scroll-mt-20 rounded-xl border bg-white p-4 shadow-xs dark:bg-card",
        toneClass,
      )}
    >
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id={`${id}-heading`}
            className="text-foreground text-base font-semibold tracking-tight"
          >
            {title}
          </h2>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
