"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Plus } from "lucide-react";

import {
  visitKindBlockStyle,
  visitKindIcon,
  visitKindIconColor,
} from "@/lib/constants/visit-kind-style";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import {
  formatDayColumnHeader,
  formatTimeShort,
  minutesSinceMidnight,
} from "@/lib/datetime/calendar-tz";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle, visitProfessionalName } from "@/lib/visits/display-title";
import {
  DEFAULT_VISIT_DURATION_MIN,
  PX_PER_HOUR,
  type PlacedVisit,
  agendaHourRows,
  isNowWithinAgendaWindow,
  layoutVisitsForDayColumn,
} from "@/lib/visits/week-time-grid-layout";
import { isMinutesWithinAgendaHours } from "@/lib/visits/agenda-hours";
import { cn } from "@/lib/utils";

function formatHourRowLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

type Props = {
  timeZone: string;
  weekKeys: string[];
  todayKey: string;
  effectiveDayKey: string;
  effectiveSelectedVisitId: string | null;
  agendaStartHour: number;
  agendaEndHour: number;
  getVisitsForDay: (dayKey: string) => ScheduledVisitWithTargets[];
  onSelectDay: (dayKey: string) => void;
  onSelectVisit: (dayKey: string, visitId: string) => void;
  onVisitDoubleClick?: (dayKey: string, visitId: string) => void;
  onVisitDrop?: (visitId: string, newStartIso: string, oldStartIso: string) => void;
  onSlotClick?: (dayKey: string, localDatetime: string) => void;
};

export function VisitWeekTimeGrid({
  timeZone,
  weekKeys,
  todayKey,
  effectiveDayKey,
  effectiveSelectedVisitId,
  agendaStartHour,
  agendaEndHour,
  getVisitsForDay,
  onSelectDay,
  onSelectVisit,
  onVisitDoubleClick,
  onVisitDrop,
  onSlotClick,
}: Props) {
  // Horas da configuração, incluindo o horário de fim (último agendamento).
  const hours = useMemo(
    () => agendaHourRows(agendaStartHour, agendaEndHour),
    [agendaStartHour, agendaEndHour],
  );
  const totalHeightPx = hours.length * PX_PER_HOUR;
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setNowMinutes(minutesSinceMidnight(new Date().toISOString(), timeZone));
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  const placedByDay = useMemo(() => {
    const m = new Map<string, PlacedVisit[]>();
    for (const dayKey of weekKeys) {
      m.set(
        dayKey,
        layoutVisitsForDayColumn(
          getVisitsForDay(dayKey),
          timeZone,
          agendaStartHour,
          agendaEndHour,
        ),
      );
    }
    return m;
  }, [weekKeys, getVisitsForDay, timeZone, agendaStartHour, agendaEndHour]);

  const dragInfoRef = useRef<{ visitId: string; oldStart: string } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const gutterWidthClass = "w-14 sm:w-16";

  return (
    <div className="border-border max-w-full rounded-xl border">
      <div className="max-h-[min(72vh,880px)] max-w-full overflow-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div
          className={cn(
            "w-full",
            weekKeys.length > 1
              ? "min-w-[44rem] sm:min-w-[52rem]"
              : "min-w-0",
          )}
        >
          {/* Cabeçalho: canto + dias */}
          <div className="bg-muted/30 border-border sticky top-0 z-40 flex border-b">
            <div
              className={cn(
                gutterWidthClass,
                "border-border sticky left-0 z-50 shrink-0 border-r bg-card",
              )}
              aria-hidden
            />
            {weekKeys.map((dayKey) => {
              const isToday = dayKey === todayKey;
              const isSelected = dayKey === effectiveDayKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => onSelectDay(dayKey)}
                  className={cn(
                    "min-w-[4.75rem] flex-1 border-l px-1 py-2.5 text-center transition-colors sm:min-w-0 sm:px-2",
                    "hover:bg-muted/50 focus-visible:ring-ring focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none",
                    isSelected && "bg-primary/10",
                    isToday && "ring-primary/50 ring-1 ring-inset",
                  )}
                >
                  <span className="text-muted-foreground block text-[0.65rem] font-medium uppercase tracking-wide">
                    {isToday ? "Hoje" : " "}
                  </span>
                  <span className="text-foreground block text-xs font-semibold capitalize sm:text-sm">
                    {formatDayColumnHeader(dayKey, timeZone)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex">
            {/* Coluna das horas */}
            <div
              className={cn(
                gutterWidthClass,
                "border-border sticky left-0 z-30 shrink-0 border-r bg-card",
              )}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: PX_PER_HOUR }}
                  className="text-muted-foreground flex items-start justify-end px-1.5 pt-1 text-[0.65rem] tabular-nums sm:px-2 sm:text-xs"
                >
                  {formatHourRowLabel(h)}
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            <div className="flex min-w-0 flex-1">
              {weekKeys.map((dayKey) => {
                const isToday = dayKey === todayKey;
                const isSelected = dayKey === effectiveDayKey;
                const placed = placedByDay.get(dayKey) ?? [];

                return (
                  <div
                    key={dayKey}
                    role="presentation"
                    className={cn(
                      "relative min-w-[4.75rem] flex-1 overflow-hidden border-l sm:min-w-0",
                      isSelected && "bg-primary/[0.03]",
                      dragOverDay === dayKey && "bg-primary/[0.07] ring-1 ring-inset ring-primary/30",
                    )}
                    onDragOver={(e) => {
                      if (!dragInfoRef.current) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverDay !== dayKey) setDragOverDay(dayKey);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setDragOverDay(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverDay(null);
                      const info = dragInfoRef.current;
                      dragInfoRef.current = null;
                      if (!info || !onVisitDrop) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const yInColumn = Math.max(0, e.clientY - rect.top);
                      const minutesFromStart = (yInColumn / PX_PER_HOUR) * 60;
                      const snapped = Math.round(minutesFromStart / 15) * 15;
                      const maxOffsetMin = Math.max(
                        0,
                        (agendaEndHour - agendaStartHour) * 60,
                      );
                      const clamped = Math.max(0, Math.min(snapped, maxOffsetMin));
                      const totalMinutes = agendaStartHour * 60 + clamped;
                      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
                      const mm = String(totalMinutes % 60).padStart(2, "0");
                      const newStartIso = localDateTimeInTimeZoneToUtcIso(`${dayKey}T${hh}:${mm}`, timeZone);
                      if (newStartIso) onVisitDrop(info.visitId, newStartIso, info.oldStart);
                    }}
                  >
                    {/* Slots de 30 min — hover individual + atalho para criar visita */}
                    {hours.flatMap((h) =>
                      [0, 30]
                        .filter((minute) =>
                          isMinutesWithinAgendaHours(
                            h * 60 + minute,
                            agendaStartHour,
                            agendaEndHour,
                          ),
                        )
                        .map((minute) => {
                        const topPx = ((h - agendaStartHour) * 60 + minute) / 60 * PX_PER_HOUR;
                        const hh = String(h).padStart(2, "0");
                        const mm = String(minute).padStart(2, "0");
                        const localDatetime = `${dayKey}T${hh}:${mm}`;
                        return (
                          <button
                            key={`slot-${h}-${minute}`}
                            type="button"
                            aria-label={`Agendar visita em ${dayKey} às ${hh}:${mm}`}
                            style={{ top: topPx, height: PX_PER_HOUR / 2 }}
                            className="group absolute left-0 right-0 z-0 flex items-center justify-center border-b border-transparent transition-colors hover:border-primary/10 hover:bg-primary/[0.05]"
                            onClick={() => {
                              onSelectDay(dayKey);
                              onSlotClick?.(dayKey, localDatetime);
                            }}
                          >
                            <span className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="text-primary size-3" aria-hidden />
                              <span className="text-primary font-mono text-[0.6rem] font-medium tabular-nums">
                                {hh}:{mm}
                              </span>
                            </span>
                          </button>
                        );
                      }),
                    )}

                    <div
                      className="pointer-events-none relative z-[1]"
                      style={{ height: totalHeightPx }}
                    >
                      {hours.map((h) => (
                        <div
                          key={h}
                          style={{ height: PX_PER_HOUR }}
                          className="border-border/70 pointer-events-none border-b border-dashed"
                        />
                      ))}
                    </div>

                    {isToday &&
                    nowMinutes !== null &&
                    isNowWithinAgendaWindow(
                      nowMinutes,
                      agendaStartHour,
                      agendaEndHour,
                    ) ? (
                      <div
                        className="pointer-events-none absolute right-0 left-0 z-20"
                        style={{ top: ((nowMinutes - agendaStartHour * 60) / 60) * PX_PER_HOUR }}
                        aria-hidden
                      >
                        <div className="bg-primary relative h-0.5 shadow-sm">
                          <span className="bg-primary text-primary-foreground absolute -top-1.5 left-0 size-2.5 rounded-full shadow-xs" />
                        </div>
                      </div>
                    ) : null}

                    <div
                      className="pointer-events-none absolute inset-0 z-10 px-0.5 pt-0"
                      style={{ height: totalHeightPx }}
                    >
                      {placed.map((p) => {
                        const active = effectiveSelectedVisitId === p.visit.id;
                        const gap = 3;
                        const pct = 100 / p.laneCount;
                        const left = `calc(${p.lane * pct}% + ${gap / 2}px)`;
                        const width = `calc(${pct}% - ${gap}px)`;
                        const kind = (p.visit.visit_kind ?? "other") as VisitKind;
                        const KindIcon = visitKindIcon[kind];
                        const professional = visitProfessionalName(
                          p.visit,
                          p.visit.creator_full_name,
                        );

                        return (
                          <button
                            key={p.visit.id}
                            type="button"
                            draggable={!!onVisitDrop}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", p.visit.id);
                              dragInfoRef.current = { visitId: p.visit.id, oldStart: p.visit.scheduled_start };
                            }}
                            onDragEnd={() => {
                              dragInfoRef.current = null;
                              setDragOverDay(null);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVisit(dayKey, p.visit.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onSelectVisit(dayKey, p.visit.id);
                              onVisitDoubleClick?.(dayKey, p.visit.id);
                            }}
                            className={cn(
                              "pointer-events-auto absolute flex flex-col overflow-hidden rounded-lg border-l-4 px-1.5 py-1.5 text-left shadow-xs transition-transform",
                              visitKindBlockStyle[kind],
                              active
                                ? "ring-primary z-[15] scale-[1.02] ring-2"
                                : "hover:brightness-[0.97] dark:hover:brightness-110",
                            )}
                            style={{
                              top: p.topPx,
                              height: p.heightPx,
                              left,
                              width,
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <KindIcon
                                className={cn("size-2.5 shrink-0", visitKindIconColor[kind])}
                                aria-hidden
                              />
                              <span className="text-foreground/70 font-mono text-[0.65rem] leading-none tabular-nums sm:text-xs">
                                {formatTimeShort(p.visit.scheduled_start, timeZone)}
                              </span>
                            </span>

                            <span className="text-foreground mt-1 min-h-0 line-clamp-2 text-[0.7rem] font-semibold leading-tight sm:text-xs">
                              {visitDisplayTitle(p.visit)}
                            </span>

                            <span className="mt-auto flex min-w-0 shrink-0 flex-col gap-0.5">
                              <span className="text-foreground truncate text-[0.65rem] font-medium leading-tight sm:text-xs">
                                {visitKindLabel[kind]}
                              </span>
                              <span className="text-foreground/80 truncate text-[0.65rem] leading-tight sm:text-xs">
                                {professional}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground border-t bg-muted/20 px-3 py-2 text-center text-[0.65rem] sm:text-xs">
        Horário em{" "}
        <span className="text-foreground font-medium">{timeZone}</span>. Cada
        bloco assume ~{DEFAULT_VISIT_DURATION_MIN} min (ajustável quando existir
        hora de fim).
      </p>
    </div>
  );
}
