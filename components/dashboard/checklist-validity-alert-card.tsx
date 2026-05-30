import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";
import { cn } from "@/lib/utils";

type Props = {
  alert: ChecklistValidityAlert;
  timeZone: string;
  /** Oculta o nome do cliente quando já aparece no cabeçalho do grupo. */
  hideClientName?: boolean;
  /** Layout compacto para grelha de 2 colunas no dashboard. */
  stacked?: boolean;
};

function formatDueDatePt(dueDateKey: string, timeZone: string): string {
  const [y, m, d] = dueDateKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
  }).format(base);
}

function buildStatusLabel(alert: ChecklistValidityAlert): string {
  if (alert.status === "vencido") {
    const days = Math.abs(alert.daysToExpire);
    return days === 0 ? "Vencido hoje" : `Vencido há ${days} dia${days > 1 ? "s" : ""}`;
  }
  if (alert.daysToExpire === 0) return "Vence hoje";
  return `Vence em ${alert.daysToExpire} dia${alert.daysToExpire > 1 ? "s" : ""}`;
}

export function ChecklistValidityAlertCard({
  alert,
  timeZone,
  hideClientName = false,
  stacked = false,
}: Props) {
  const dueLabel = formatDueDatePt(alert.validUntil, timeZone);
  const statusLabel = buildStatusLabel(alert);
  const urgencyClasses =
    alert.status === "vencido"
      ? "border-l-[3px] border-l-destructive bg-red-50/50 dark:bg-red-950/20"
      : "border-l-[3px] border-l-warning bg-amber-50/50 dark:bg-amber-950/20";

  const titleId = `validity-alert-title-${alert.responseId}`;
  const href = `/checklists/preencher/${alert.sessionId}?returnTo=${encodeURIComponent("/inicio")}`;
  const ariaLabel = `Abrir checklist ${alert.checklistName} de ${alert.clientName}, ${statusLabel}`;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-labelledby={titleId}
      aria-label={ariaLabel}
      className={cn(
        "group block rounded-lg border border-border transition-colors",
        "hover:border-primary/35 hover:bg-background/80 hover:shadow-xs",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        stacked ? "p-2.5" : "p-3",
        urgencyClasses,
      )}
    >
      <div className={cn("flex gap-2", !stacked && "gap-2.5")}>
        <AlertTriangle
          className={cn(
            "mt-0.5 shrink-0",
            stacked ? "size-3.5" : "size-4",
            alert.status === "vencido"
              ? "text-destructive"
              : "text-amber-600 dark:text-amber-400",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          {hideClientName ? (
            <p
              id={titleId}
              className="text-foreground truncate text-sm font-semibold leading-tight group-hover:text-primary"
            >
              {alert.checklistName}
            </p>
          ) : (
            <>
              <p
                id={titleId}
                className="text-foreground truncate text-sm font-semibold leading-tight"
              >
                {alert.clientName}
              </p>
              <p className="text-foreground truncate text-xs font-medium leading-snug group-hover:text-primary">
                {alert.checklistName}
              </p>
            </>
          )}
          <p className="text-muted-foreground text-xs leading-snug">
            <span className="text-foreground/90 tabular-nums">{dueLabel}</span>
            <span aria-hidden> · </span>
            <span>{statusLabel}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
