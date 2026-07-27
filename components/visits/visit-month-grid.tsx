"use client";

import { visitKindBlockStyle } from "@/lib/constants/visit-kind-style";
import { formatTimeShort } from "@/lib/datetime/calendar-tz";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const MAX_VISIBLE_VISITS = 3;

type MonthCell = { key: string; inMonth: boolean };

type Props = {
  timeZone: string;
  cells: MonthCell[];
  todayKey: string;
  effectiveDayKey: string;
  effectiveSelectedVisitId: string | null;
  getVisitsForDay: (dayKey: string) => ScheduledVisitWithTargets[];
  onSelectDay: (dayKey: string) => void;
  onSelectVisit: (dayKey: string, visitId: string) => void;
  onVisitDoubleClick?: (dayKey: string, visitId: string) => void;
  onDayDoubleClick?: (dayKey: string) => void;
};

export function VisitMonthGrid({
  timeZone,
  cells,
  todayKey,
  effectiveDayKey,
  effectiveSelectedVisitId,
  getVisitsForDay,
  onSelectDay,
  onSelectVisit,
  onVisitDoubleClick,
  onDayDoubleClick,
}: Props) {
  return (
    <div className="border-border max-w-full overflow-hidden rounded-xl border">
      <div className="text-muted-foreground bg-muted/30 border-border grid grid-cols-7 border-b text-center text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 py-2">
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        role="grid"
        aria-label="Calendário mensal de visitas"
      >
        {cells.map(({ key, inMonth }) => {
          const dayVisits = inMonth ? getVisitsForDay(key) : [];
          const isToday = key === todayKey;
          const isSelected = key === effectiveDayKey;
          const overflow = Math.max(0, dayVisits.length - MAX_VISIBLE_VISITS);
          const visible = dayVisits.slice(0, MAX_VISIBLE_VISITS);
          const dayNum = Number(key.slice(8, 10));

          return (
            <div
              key={key}
              role="gridcell"
              className={cn(
                "border-border/70 flex min-h-[5.5rem] flex-col gap-0.5 border-b border-r p-1 sm:min-h-[7rem] sm:p-1.5",
                !inMonth && "bg-muted/20",
                isSelected && inMonth && "bg-primary/[0.06]",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(key)}
                onDoubleClick={() => {
                  onSelectDay(key);
                  onDayDoubleClick?.(key);
                }}
                className={cn(
                  "mb-0.5 flex size-7 shrink-0 items-center justify-center self-start rounded-full text-xs font-semibold transition-colors sm:size-8 sm:text-sm",
                  !inMonth && "text-muted-foreground/40",
                  inMonth && "text-foreground hover:bg-muted",
                  isSelected &&
                    inMonth &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isSelected &&
                    isToday &&
                    inMonth &&
                    "ring-primary ring-2 ring-inset",
                )}
                aria-label={`Dia ${dayNum}`}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
              >
                {dayNum}
              </button>

              {inMonth && visible.length > 0 ? (
                <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {visible.map((v) => {
                    const kind = (v.visit_kind ?? "other") as VisitKind;
                    const active = effectiveSelectedVisitId === v.id;
                    return (
                      <li key={v.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDay(key);
                            onSelectVisit(key, v.id);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onSelectDay(key);
                            onSelectVisit(key, v.id);
                            onVisitDoubleClick?.(key, v.id);
                          }}
                          className={cn(
                            "w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[0.6rem] leading-tight transition-colors sm:text-[0.65rem]",
                            visitKindBlockStyle[kind],
                            active
                              ? "ring-primary ring-1 ring-inset"
                              : "hover:brightness-[0.97] dark:hover:brightness-110",
                          )}
                          title={`${formatTimeShort(v.scheduled_start, timeZone)} · ${visitDisplayTitle(v)}`}
                        >
                          <span className="text-muted-foreground font-mono">
                            {formatTimeShort(v.scheduled_start, timeZone)}
                          </span>{" "}
                          <span className="text-foreground font-medium">
                            {visitDisplayTitle(v)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {overflow > 0 ? (
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelectDay(key)}
                        className="text-muted-foreground hover:text-foreground w-full truncate px-1 text-left text-[0.6rem] font-medium sm:text-[0.65rem]"
                      >
                        +{overflow} mais
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
