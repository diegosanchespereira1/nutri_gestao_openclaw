import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";

import { RegulatoryCountdown } from "@/components/dashboard/regulatory-countdown";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ComplianceDashboardAlert } from "@/lib/types/compliance-deadlines";
import { calendarDaysUntilDueDate } from "@/lib/datetime/calendar-tz";
import { cn } from "@/lib/utils";

type Props = {
  alert: ComplianceDashboardAlert;
  timeZone: string;
};

function formatDueDatePt(dueDateKey: string, timeZone: string): string {
  const [y, m, d] = dueDateKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    dateStyle: "long",
  }).format(base);
}

export function RegulatoryAlertCard({ alert, timeZone }: Props) {
  const days = calendarDaysUntilDueDate(alert.due_date, timeZone, new Date());
  const dueLabel = formatDueDatePt(alert.due_date, timeZone);
  const checklistHref = alert.checklist_template_id
    ? `/checklists?template=${encodeURIComponent(alert.checklist_template_id)}`
    : "/checklists";
  const manageHref = `/clientes/${alert.client_id}/estabelecimentos/${alert.establishment_id}/editar`;

  const statusWord =
    days < 0 ? "Em atraso" : days === 0 ? "Termina hoje" : days <= 7 ? "Prazo próximo" : "A planear";

  const surface =
    days < 0
      ? "border-destructive/40 bg-destructive/5"
      : days <= 7
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-border bg-card/60";

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:flex-row sm:items-start sm:justify-between",
        surface,
      )}
      aria-labelledby={`reg-alert-title-${alert.id}`}
    >
      <div className="min-w-0 flex gap-3">
        <div
          className="text-foreground mt-0.5 shrink-0"
          aria-hidden
        >
          <AlertTriangle
            className={cn(
              "size-5",
              days < 0
                ? "text-destructive"
                : days <= 7
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <p
            id={`reg-alert-title-${alert.id}`}
            className="text-foreground font-medium leading-snug"
          >
            {alert.title}
          </p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
            <Building2 className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
            <span>{alert.establishment_name}</span>
          </p>
          {alert.portaria_ref ? (
            <p className="text-muted-foreground text-xs">
              Portaria (ref.): {alert.portaria_ref}
            </p>
          ) : null}
          <p className="text-foreground text-sm">
            <span className="font-medium">Estado textual:</span> {statusWord}
            <span aria-hidden> · </span>
            <span className="font-medium">Data limite:</span> {dueLabel}
          </p>
          <RegulatoryCountdown dueDateKey={alert.due_date} timeZone={timeZone} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Link
          href={checklistHref}
          className={cn(
            buttonVariants({ size: "sm" }),
            "min-h-11 w-full justify-center sm:w-auto",
          )}
        >
          Ver checklist
        </Link>
        <Link
          href={manageHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground w-full justify-center sm:w-auto",
          )}
        >
          Gerir prazos
        </Link>
      </div>
    </article>
  );
}
