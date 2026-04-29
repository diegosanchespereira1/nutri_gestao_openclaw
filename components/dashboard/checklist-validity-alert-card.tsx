import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";
import { cn } from "@/lib/utils";

type Props = {
  alert: ChecklistValidityAlert;
  timeZone: string;
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

export function ChecklistValidityAlertCard({ alert, timeZone }: Props) {
  const dueLabel = formatDueDatePt(alert.validUntil, timeZone);
  const statusLabel = buildStatusLabel(alert);
  const urgencyClasses =
    alert.status === "vencido"
      ? "border-l-4 border-l-destructive bg-red-50/60"
      : "border-l-4 border-l-warning bg-amber-50/60";

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between",
        urgencyClasses,
      )}
      aria-labelledby={`validity-alert-title-${alert.responseId}`}
    >
      <div className="min-w-0 flex gap-3">
        <AlertTriangle
          className={cn(
            "mt-0.5 size-5 shrink-0",
            alert.status === "vencido"
              ? "text-destructive"
              : "text-amber-600 dark:text-amber-400",
          )}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p
            id={`validity-alert-title-${alert.responseId}`}
            className="text-foreground font-medium leading-snug"
          >
            {alert.clientName}
          </p>
          <p className="text-muted-foreground text-sm">
            Checklist: <span className="text-foreground">{alert.checklistName}</span>
          </p>
          <p className="text-foreground flex flex-wrap items-center gap-1 text-sm">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">Validade:</span>
            <span>{dueLabel}</span>
            <span aria-hidden>·</span>
            <span>{statusLabel}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Link
          href={`/checklists/preencher/${alert.sessionId}`}
          className={cn(
            buttonVariants({ size: "sm" }),
            "min-h-11 w-full justify-center sm:w-auto",
          )}
        >
          Abrir checklist
        </Link>
        <Link
          href={`/clientes/${alert.clientId}/editar`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground w-full justify-center sm:w-auto",
          )}
        >
          Ver cliente
        </Link>
      </div>
    </article>
  );
}
