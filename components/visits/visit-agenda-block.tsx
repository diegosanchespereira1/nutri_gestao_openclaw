import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  formatDateTimeShort,
  isSameCalendarDay,
} from "@/lib/datetime/calendar-tz";
import {
  visitPriorityAgendaSurface,
  visitPriorityLabel,
} from "@/lib/constants/visit-priorities";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

type Props = {
  visit: ScheduledVisitWithTargets;
  /** Fuso IANA do profissional (Definições → Região). */
  timeZone: string;
  /** Se true, mostra CTA “Iniciar visita” quando for o dia civil local e estado agendada. */
  showStartCta?: boolean;
};

export function VisitAgendaBlock({
  visit,
  timeZone,
  showStartCta = true,
}: Props) {
  const title = visitDisplayTitle(visit);
  const when = formatDateTimeShort(visit.scheduled_start, timeZone);
  const priorityLabel = visitPriorityLabel[visit.priority];
  const isTodaySlot =
    (visit.status === "scheduled" || visit.status === "in_progress") &&
    isSameCalendarDay(visit.scheduled_start, timeZone);
  const canStart = showStartCta && isTodaySlot;

  const kind = (visit.visit_kind ?? "other") as VisitKind;

  return (
    <article
      className={cn(
        "border-border flex flex-col gap-3 rounded-xl border border-l-4 bg-card/50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between",
        visitPriorityAgendaSurface[visit.priority],
        isTodaySlot ? "ring-primary/30 ring-2" : null,
      )}
    >
      <div className="min-w-0">
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">
          {when} · Prioridade: {priorityLabel}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          <span className="text-foreground/90 font-medium">
            {visitKindLabel[kind]}
          </span>
          <span aria-hidden> · </span>
          <span className="capitalize">
            {visit.target_type === "establishment"
              ? "estabelecimento"
              : "paciente"}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={`/visitas/${visit.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "min-h-11 min-w-[44px] items-center justify-center px-4",
          )}
        >
          Ver
        </Link>
        {canStart ? (
          <Link
            href={`/visitas/${visit.id}/iniciar`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-h-11 min-w-[44px] items-center justify-center px-4",
            )}
          >
            {visit.status === "in_progress" ? "Continuar visita" : "Iniciar visita"}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
