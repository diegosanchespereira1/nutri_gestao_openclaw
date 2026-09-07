import { minutesSinceMidnight } from "@/lib/datetime/calendar-tz";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

/** Altura de cada hora na grelha (px). */
export const PX_PER_HOUR = 80;
/** Duração assumida por visita (sem `scheduled_end` na BD). */
export const DEFAULT_VISIT_DURATION_MIN = 60;
export const MIN_BLOCK_HEIGHT_PX = 72;

export type PlacedVisit = {
  visit: ScheduledVisitWithTargets;
  lane: number;
  laneCount: number;
  topPx: number;
  heightPx: number;
};

/**
 * Linhas horárias da grelha: início e fim inclusivos.
 * Ex.: 08–19 gera 08:00 … 19:00 (último horário agendável).
 */
export function agendaHourRows(
  agendaStartHour: number,
  agendaEndHour: number,
): number[] {
  const span = Math.max(0, agendaEndHour - agendaStartHour + 1);
  return Array.from({ length: span }, (_, i) => agendaStartHour + i);
}

export function isNowWithinAgendaWindow(
  nowMinutes: number,
  agendaStartHour: number,
  agendaEndHour: number,
): boolean {
  return (
    nowMinutes >= agendaStartHour * 60 &&
    nowMinutes < (agendaEndHour + 1) * 60
  );
}

function visitOverlapsAgendaWindow(
  startMin: number,
  endMin: number,
  windowStart: number,
  windowEnd: number,
): boolean {
  return endMin > windowStart && startMin < windowEnd;
}

export function layoutVisitsForDayColumn(
  visits: ScheduledVisitWithTargets[],
  timeZone: string,
  agendaStartHour: number,
  agendaEndHour: number,
): PlacedVisit[] {
  if (visits.length === 0) return [];

  const windowStart = agendaStartHour * 60;
  const windowEnd = (agendaEndHour + 1) * 60;
  const visibleHeightPx = ((windowEnd - windowStart) / 60) * PX_PER_HOUR;

  const enriched = visits
    .map((v) => {
      const startMin = minutesSinceMidnight(v.scheduled_start, timeZone);
      const endMin = startMin + DEFAULT_VISIT_DURATION_MIN;
      return { v, startMin, endMin };
    })
    .filter((it) =>
      visitOverlapsAgendaWindow(
        it.startMin,
        it.endMin,
        windowStart,
        windowEnd,
      ),
    )
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

  return assigned.map((it) => {
    const clippedStart = Math.max(it.startMin, windowStart);
    const clippedEnd = Math.min(it.endMin, windowEnd);
    const topPx = ((clippedStart - windowStart) / 60) * PX_PER_HOUR;
    const rawHeight = Math.max(
      ((clippedEnd - clippedStart) / 60) * PX_PER_HOUR,
      MIN_BLOCK_HEIGHT_PX,
    );
    const heightPx = Math.max(0, Math.min(rawHeight, visibleHeightPx - topPx));

    return {
      visit: it.v,
      lane: it.lane,
      laneCount,
      topPx,
      heightPx,
    };
  });
}
