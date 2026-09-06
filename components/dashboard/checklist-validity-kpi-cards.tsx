import Link from "next/link";
import { AlertTriangle, Clock3 } from "lucide-react";

import {
  CHECKLISTS_A_VENCER_PATH,
  CHECKLISTS_VENCIDOS_PATH,
} from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  vencidos: number;
  proximos: number;
};

function ValidityKpiCard({
  href,
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  tone: "danger" | "warning";
  icon: typeof AlertTriangle;
}) {
  const urgent = value > 0;
  const noun = value === 1 ? "checklist" : "checklists";

  return (
    <Link
      href={href}
      prefetch
      aria-label={`Ver ${value} ${noun} ${label.toLocaleLowerCase("pt-BR")}`}
      className={cn(
        "min-h-11 rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-colors",
        "hover:border-primary/35 hover:bg-background/80 hover:shadow-sm",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        tone === "danger"
          ? "border-l-4 border-l-destructive"
          : "border-l-4 border-l-warning",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {label}
        </p>
        <Icon
          className={cn(
            "size-4 shrink-0",
            tone === "danger"
              ? "text-destructive"
              : "text-amber-600 dark:text-amber-400",
          )}
          aria-hidden
        />
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight tabular-nums",
          urgent && tone === "danger" && "text-destructive",
          urgent && tone === "warning" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </Link>
  );
}

export function ChecklistValidityKpiCards({ vencidos, proximos }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ValidityKpiCard
        href={CHECKLISTS_VENCIDOS_PATH}
        label="Vencidos"
        value={vencidos}
        hint="último ano · ver todos"
        tone="danger"
        icon={AlertTriangle}
      />
      <ValidityKpiCard
        href={CHECKLISTS_A_VENCER_PATH}
        label="A vencer"
        value={proximos}
        hint="próximos 90 dias · ver todos"
        tone="warning"
        icon={Clock3}
      />
    </div>
  );
}
