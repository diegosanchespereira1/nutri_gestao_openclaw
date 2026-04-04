"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, UserRound } from "lucide-react";

import { visitPriorityAgendaSurface, visitPriorityLabel } from "@/lib/constants/visit-priorities";
import {
  formatDayColumnHeader,
  formatTimeShort,
  minutesSinceMidnight,
} from "@/lib/datetime/calendar-tz";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

/** Altura de cada hora na grelha (px). */
const PX_PER_HOUR = 52;
/** Duração assumida por visita (sem `scheduled_end` na BD). */
const DEFAULT_VISIT_DURATION_MIN = 60;
const MIN_BLOCK_HEIGHT_PX = 44;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

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
): PlacedVisit[] {
  if (visits.length === 0) return [];

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
    topPx: (it.startMin / 60) * PX_PER_HOUR,
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
  getVisitsForDay: (dayKey: string) => ScheduledVisitWithTargets[];
  onSelectDay: (dayKey: string) => void;
  onSelectVisit: (dayKey: string, visitId: string) => void;
  /** Duplo clique no bloco (ex.: modal de detalhe). */
  onVisitDoubleClick?: (dayKey: string, visitId: string) => void;
};

export function VisitWeekTimeGrid({
  timeZone,
  weekKeys,
  todayKey,
  effectiveDayKey,
  effectiveSelectedVisitId,
  getVisitsForDay,
  onSelectDay,
  onSelectVisit,
  onVisitDoubleClick,
}: Props) {
  const totalHeightPx = HOURS.length * PX_PER_HOUR;
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setNowMinutes(
        minutesSinceMidnight(new Date().toISOString(), timeZone),
      );
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
        layoutVisitsForDayColumn(getVisitsForDay(dayKey), timeZone),
      );
    }
    return m;
  }, [weekKeys, getVisitsForDay, timeZone]);

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
                    {isToday ? "Hoje" : "\u00a0"}
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
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: PX_PER_HOUR }}
                  className="text-muted-foreground flex items-start justify-end pr-1 pt-0 text-[0.65rem] tabular-nums sm:pr-2 sm:text-xs"
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
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`Dia ${dayKey}: limpar seleção de visita`}
                      className={cn(
                        "absolute inset-0 z-0 w-full",
                        isSelected ? "bg-primary/[0.02]" : "bg-transparent",
                      )}
                      onClick={() => onSelectDay(dayKey)}
                    />

                    <div
                      className="pointer-events-none relative z-[1]"
                      style={{ height: totalHeightPx }}
                    >
                      {HOURS.map((h) => (
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
                        style={{
                          top: (nowMinutes / 60) * PX_PER_HOUR,
                        }}
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

                        return (
                          <button
                            key={p.visit.id}
                            type="button"
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
                              "pointer-events-auto absolute flex flex-col overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left shadow-xs transition-transform",
                              visitPriorityAgendaSurface[p.visit.priority],
                              active
                                ? "ring-primary z-[15] scale-[1.02] ring-2"
                                : "hover:brightness-[0.98] dark:hover:brightness-110",
                            )}
                            style={{
                              top: p.topPx,
                              height: p.heightPx,
                              left,
                              width,
                              minHeight: MIN_BLOCK_HEIGHT_PX,
                            }}
                          >
                            <span className="text-muted-foreground font-mono text-[0.6rem] leading-none sm:text-[0.65rem]">
                              {formatTimeShort(
                                p.visit.scheduled_start,
                                timeZone,
                              )}
                            </span>
                            <span className="text-foreground mt-0.5 line-clamp-2 text-[0.65rem] font-semibold leading-tight sm:text-xs">
                              {visitDisplayTitle(p.visit)}
                            </span>
                            <span className="text-muted-foreground mt-auto flex items-center gap-0.5 text-[0.55rem]">
                              {p.visit.target_type === "establishment" ? (
                                <Building2 className="size-2.5 shrink-0" />
                              ) : (
                                <UserRound className="size-2.5 shrink-0" />
                              )}
                              <span className="truncate">
                                {visitPriorityLabel[p.visit.priority]}
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
