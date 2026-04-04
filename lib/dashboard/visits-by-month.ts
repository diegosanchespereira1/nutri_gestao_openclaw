import { todayKey, visitDayKey } from "@/lib/datetime/calendar-tz";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

export type VisitsByMonthBucket = {
  monthKey: string;
  label: string;
  count: number;
};

function lastNMonthKeys(
  n: number,
  timeZone: string,
  reference: Date,
): string[] {
  const todayK = todayKey(reference, timeZone);
  let y = Number.parseInt(todayK.slice(0, 4), 10);
  let m = Number.parseInt(todayK.slice(5, 7), 10);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

function formatMonthYearShort(monthKey: string, timeZone: string): string {
  const [ys, ms] = monthKey.split("-");
  const y = Number.parseInt(ys, 10);
  const mo = Number.parseInt(ms, 10);
  const base = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(base);
}

/**
 * Conta visitas não canceladas por mês civil (fusos do utilizador), últimos N meses.
 */
export function buildVisitsByMonthSeries(
  visits: ScheduledVisitWithTargets[],
  timeZone: string,
  monthCount = 6,
  reference: Date = new Date(),
): VisitsByMonthBucket[] {
  const keys = lastNMonthKeys(monthCount, timeZone, reference);
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, 0);

  for (const v of visits) {
    if (v.status === "cancelled") continue;
    const dayK = visitDayKey(v.scheduled_start, timeZone);
    const mk = dayK.slice(0, 7);
    if (counts.has(mk)) {
      counts.set(mk, (counts.get(mk) ?? 0) + 1);
    }
  }

  return keys.map((monthKey) => ({
    monthKey,
    label: formatMonthYearShort(monthKey, timeZone),
    count: counts.get(monthKey) ?? 0,
  }));
}

export function visitsByMonthHasData(buckets: VisitsByMonthBucket[]): boolean {
  return buckets.some((b) => b.count > 0);
}
