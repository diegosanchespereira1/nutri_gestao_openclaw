import Link from "next/link";

import { cn } from "@/lib/utils";

export type DashboardKpiTone = "default" | "danger" | "warning" | "money";

type Props = {
  label: string;
  value: string;
  hint: string;
  tone: DashboardKpiTone;
  href: string;
};

export function DashboardKpiButton({ label, value, hint, tone, href }: Props) {
  const toneClass =
    tone === "danger"
      ? "border-l-4 border-l-destructive"
      : tone === "warning"
        ? "border-l-4 border-l-warning"
        : tone === "money"
          ? "border-l-4 border-l-amber-600/80"
          : "border-l-4 border-l-primary";

  return (
    <Link
      href={href}
      className={cn(
        "border-border min-h-11 rounded-xl border bg-white p-3 text-left shadow-xs transition-colors dark:bg-card",
        "hover:border-primary/35 hover:bg-background/80",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        toneClass,
      )}
    >
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </Link>
  );
}
