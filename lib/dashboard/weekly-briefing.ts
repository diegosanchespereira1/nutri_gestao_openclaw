import {
  addCalendarDays,
  formatDayKeyLong,
  todayKey,
  visitDayKey,
} from "@/lib/datetime/calendar-tz";
import type { ComplianceDashboardAlert } from "@/lib/types/compliance-deadlines";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";

const MAX_VISITS = 10;
const MAX_ALERTS = 10;

export type WeeklyBriefingVisitLine = {
  id: string;
  scheduled_start: string;
  title: string;
  detailHref: string;
};

export type WeeklyBriefingData = {
  /** Inclusive, `YYYY-MM-DD`. */
  windowStartKey: string;
  windowEndKey: string;
  rangeLabel: string;
  visits: WeeklyBriefingVisitLine[];
  alerts: ComplianceDashboardAlert[];
  totalVisitsInWindow: number;
  totalAlertsInWindow: number;
};

function formatBriefingRange(
  startKey: string,
  endKey: string,
  timeZone: string,
): string {
  return `${formatDayKeyLong(startKey, timeZone)} a ${formatDayKeyLong(endKey, timeZone)}`;
}

/**
 * Janela móvel de 7 dias civis (hoje → +6) no fuso do perfil.
 * Filtra visitas agendadas/em curso e prazos de compliance já carregados.
 */
export function buildWeeklyBriefing(
  allVisits: ScheduledVisitWithTargets[],
  complianceAlerts: ComplianceDashboardAlert[],
  timeZone: string,
): WeeklyBriefingData {
  const windowStartKey = todayKey(new Date(), timeZone);
  const windowEndKey = addCalendarDays(windowStartKey, 6, timeZone);

  const visitsInWindow = allVisits
    .filter((v) => {
      if (v.status !== "scheduled" && v.status !== "in_progress") {
        return false;
      }
      const k = visitDayKey(v.scheduled_start, timeZone);
      return k >= windowStartKey && k <= windowEndKey;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime(),
    );

  const alertsInWindow = complianceAlerts.filter((a) => {
    const d = a.due_date.slice(0, 10);
    return d >= windowStartKey && d <= windowEndKey;
  });

  return {
    windowStartKey,
    windowEndKey,
    rangeLabel: formatBriefingRange(windowStartKey, windowEndKey, timeZone),
    visits: visitsInWindow.slice(0, MAX_VISITS).map((v) => ({
      id: v.id,
      scheduled_start: v.scheduled_start,
      title: visitDisplayTitle(v),
      detailHref: `/visitas/${v.id}`,
    })),
    alerts: alertsInWindow.slice(0, MAX_ALERTS),
    totalVisitsInWindow: visitsInWindow.length,
    totalAlertsInWindow: alertsInWindow.length,
  };
}
