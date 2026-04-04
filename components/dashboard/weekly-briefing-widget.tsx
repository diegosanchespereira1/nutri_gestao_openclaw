import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import type { WeeklyBriefingData } from "@/lib/dashboard/weekly-briefing";
import { formatDateTimeShort } from "@/lib/datetime/calendar-tz";
import { cn } from "@/lib/utils";

type Props = {
  briefing: WeeklyBriefingData;
  timeZone: string;
};

export function WeeklyBriefingWidget({ briefing, timeZone }: Props) {
  const {
    rangeLabel,
    visits,
    alerts,
    totalVisitsInWindow,
    totalAlertsInWindow,
  } = briefing;

  const hasContent = visits.length > 0 || alerts.length > 0;
  const visitsMore = totalVisitsInWindow > visits.length;
  const alertsMore = totalAlertsInWindow > alerts.length;

  return (
    <details
      className="border-border bg-card/40 rounded-xl border shadow-xs open:shadow-sm [&[open]_summary_svg]:rotate-90"
    >
      <summary className="text-foreground hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block">Briefing da semana</span>
          <span className="text-muted-foreground font-normal">
            Próximos 7 dias · {rangeLabel}
          </span>
        </span>
        <ChevronRight
          className="text-muted-foreground size-5 shrink-0 transition-transform"
          aria-hidden
        />
      </summary>
      <div className="border-border space-y-5 border-t px-4 py-4">
        {!hasContent ? (
          <p className="text-muted-foreground text-sm" role="status">
            Sem visitas nem prazos de compliance nesta janela. Os alertas do
            painel abaixo podem incluir horizontes mais longos.
          </p>
        ) : null}

        {visits.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Visitas
            </h4>
            <ul className="space-y-2" aria-label="Visitas nos próximos 7 dias">
              {visits.map((v) => (
                <li key={v.id}>
                  <Link
                    href={v.detailHref}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "border-border h-auto min-h-10 w-full justify-between gap-2 border bg-background/80 px-3 py-2 font-normal",
                    )}
                  >
                    <span className="min-w-0 truncate text-left font-medium">
                      {v.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDateTimeShort(v.scheduled_start, timeZone)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {visitsMore ? (
              <p className="text-muted-foreground text-xs">
                +{totalVisitsInWindow - visits.length} visita
                {totalVisitsInWindow - visits.length === 1 ? "" : "s"} na
                janela — ver{" "}
                <Link
                  href="/visitas"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Agenda de visitas
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {alerts.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Prazos (compliance)
            </h4>
            <ul
              className="space-y-2"
              aria-label="Prazos nos próximos 7 dias"
            >
              {alerts.map((a) => (
                <li key={a.id}>
                  <div className="border-border rounded-lg border bg-background/80 px-3 py-2 text-sm">
                    <p className="text-foreground font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {a.establishment_name} · Limite {a.due_date}
                    </p>
                    <Link
                      href={
                        a.checklist_template_id
                          ? `/checklists?template=${encodeURIComponent(a.checklist_template_id)}`
                          : "/checklists"
                      }
                      className="text-primary mt-1 inline-block text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Ver checklist
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            {alertsMore ? (
              <p className="text-muted-foreground text-xs">
                +{totalAlertsInWindow - alerts.length} prazo
                {totalAlertsInWindow - alerts.length === 1 ? "" : "s"} nesta
                janela — ver alertas completos abaixo.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
