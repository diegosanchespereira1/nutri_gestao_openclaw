"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Plus } from "lucide-react";

import {
  visitKindBlockStyle,
  visitKindIcon,
  visitKindIconColor,
} from "@/lib/constants/visit-kind-style";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { visitPriorityAgendaSurface } from "@/lib/constants/visit-priorities";
import {
  formatDayColumnHeader,
  formatTimeShort,
  minutesSinceMidnight,
} from "@/lib/datetime/calendar-tz";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

/** Altura de cada hora na grelha (px). */
const PX_PER_HOUR = 80;
/** Duração assumida por visita (sem `scheduled_end` na BD). */
const DEFAULT_VISIT_DURATION_MIN = 60;
const MIN_BLOCK_HEIGHT_PX = 52;

function formatHourRowLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

type PlacedVisit = {
  visit: ScheduledVisitWithTargets;
  lane: number;
  laneCount: number;
  topPx: number;
  heightPx: number;
};

function layoutVisitsForDayColumn(
  visits: ScheduledVisitWithTargets[],
  timeZone: string,
  agendaStartHour: number,
): PlacedVisit[] {
  if (visits.length === 0) return [];

  const offsetMin = agendaStartHour * 60;

  const enriched = visits
    .map((v) => {
      const startMin = minutesSinceMidnight(v.scheduled_start, timeZone);
      const endMin = startMin + DEFAULT_VISIT_DURATION_MIN;
      return { v, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const laneEnds: number[] = [];

  const assigned = enriched.map((it) => {
    let lane = 0;
    for (; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= it.startMin) break;
    }
    if (lane === laneEnds.length) {
      laneEnds.push(it.endMin);
    } else {
      laneEnds[lane] = it.endMin;
    }
    return { ...it, lane };
  });

  const laneCount = Math.max(1, laneEnds.length);

  return assigned.map((it) => ({
    visit: it.v,
    lane: it.lane,
    laneCount,
    topPx: ((it.startMin - offsetMin) / 60) * PX_PER_HOUR,
    heightPx: Math.max(
      (DEFAULT_VISIT_DURATION_MIN / 60) * PX_PER_HOUR,
      MIN_BLOCK_HEIGHT_PX,
    ),
  }));
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
  // Apenas as horas dentro do intervalo configurado.
  const hours = useMemo(
    () => Array.from({ length: agendaEndHour - agendaStartHour + 1 }, (_, i) => agendaStartHour + i),
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
      m.set(dayKey, layoutVisitsForDayColumn(getVisitsForDay(dayKey), timeZone, agendaStartHour));
    }
    return m;
  }, [weekKeys, getVisitsForDay, timeZone, agendaStartHour]);

  const dragInfoRef = useRef<{ visitId: string; oldStart: string } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const gutterWidthClass = "w-12 sm:w-14";

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="max-h-[min(72vh,880px)] overflow-auto">
        <div className="min-w-[44rem] sm:min-w-[52rem]">
          {/* Cabeçalho: canto + dias */}
          <div className="bg-muted/30 border-border sticky top-0 z-40 flex border-b">
            <div
              className={cn(
                gutterWidthClass,
                "border-border sticky left-0 z-50 shrink-0 border-r bg-card",
              )}
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
                    "min-w-0 flex-1 border-l px-1 py-2.5 text-center transition-colors sm:px-2",
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
                  className="text-muted-foreground flex items-start justify-end pr-1 pt-1 text-[0.65rem] tabular-nums sm:pr-2 sm:text-xs"
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
                      "relative min-w-0 flex-1 border-l",
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
                      const clamped = Math.max(0, Math.min(snapped, (agendaEndHour - agendaStartHour) * 60));
                      const totalMinutes = agendaStartHour * 60 + clamped;
                      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
                      const mm = String(totalMinutes % 60).padStart(2, "0");
                      const newStartIso = localDateTimeInTimeZoneToUtcIso(`${dayKey}T${hh}:${mm}`, timeZone);
                      if (newStartIso) onVisitDrop(info.visitId, newStartIso, info.oldStart);
                    }}
                  >
                    {/* Slots de 30 min — hover individual + atalho para criar visita */}
                    {hours.flatMap((h) =>
                      [0, 30].map((minute) => {
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

                    {isToday && nowMinutes !== null ? (
                      <div
                        className="pointer-events-none absolute right-0 left-0 z-20"
                        style={{ top: ((nowMinutes - agendaStartHour * 60) / 60) * PX_PER_HOUR }}
                        aria-hidden
                      >
                        <div className="bg-primary relative h-0.5 shadow-sm">
                          <span className="bg-primary text-primary-foreground absolute -top-1.5 -left-1 size-2.5 rounded-full shadow-xs" />
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
                        const professional = p.visit.team_members?.full_name ?? "Titular";

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
                              minHeight: MIN_BLOCK_HEIGHT_PX,
                            }}
                          >
                            {/* Linha 1: ícone do tipo + hora */}
                            <span className="flex items-center gap-1">
                              <KindIcon
                                className={cn("size-2.5 shrink-0", visitKindIconColor[kind])}
                                aria-hidden
                              />
                              <span className="text-muted-foreground font-mono text-[0.6rem] leading-none sm:text-[0.65rem]">
                                {formatTimeShort(p.visit.scheduled_start, timeZone)}
                              </span>
                            </span>

                            {/* Linha 2: título */}
                            <span className="text-foreground mt-1 line-clamp-2 text-[0.65rem] font-semibold leading-tight sm:text-xs">
                              {visitDisplayTitle(p.visit)}
                            </span>

                            {/* Linha 3: profissional · tipo */}
                            <span className="text-muted-foreground mt-auto truncate text-[0.55rem] leading-none sm:text-[0.6rem]">
                              {professional}
                              <span aria-hidden> · </span>
                              {visitKindLabel[kind]}
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
