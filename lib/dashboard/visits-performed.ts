import {
  addCalendarDays,
  startOfIsoWeekMonday,
  todayKey,
  visitDayKey,
} from "@/lib/datetime/calendar-tz";

export const VISITS_PERFORMED_PERIODS = [
  "week",
  "month",
  "3m",
  "6m",
  "1y",
  "ytd",
] as const;

export type VisitsPerformedPeriod = (typeof VISITS_PERFORMED_PERIODS)[number];

export type VisitPerformedInput = {
  scheduled_start: string;
  status: string;
  assigned_team_member_id: string | null;
  user_id: string;
  team_members?:
    | { full_name: string }
    | { full_name: string }[]
    | null;
  creator_full_name?: string | null;
  target_type?: "establishment" | "patient";
  target_name?: string;
  visit_kind_label?: string;
  priority_label?: string;
  professional_label?: string;
};

export type VisitsPerformedBucket = {
  key: string;
  label: string;
  count: number;
};

export const VISITS_PERFORMED_PERIOD_OPTIONS: ReadonlyArray<{
  value: VisitsPerformedPeriod;
  label: string;
  helper: string;
}> = [
  {
    value: "week",
    label: "Semana",
    helper: "Visitas concluídas nos últimos 7 dias.",
  },
  {
    value: "month",
    label: "4 semanas",
    helper: "Visitas concluídas nas últimas 4 semanas.",
  },
  {
    value: "3m",
    label: "3 meses",
    helper: "Visitas concluídas nos últimos 3 meses.",
  },
  {
    value: "6m",
    label: "6 meses",
    helper: "Visitas concluídas nos últimos 6 meses.",
  },
  {
    value: "1y",
    label: "1 ano",
    helper: "Visitas concluídas nos últimos 12 meses.",
  },
  {
    value: "ytd",
    label: "Ano até hoje",
    helper: "Visitas concluídas no ano até hoje.",
  },
];

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export function isVisitsPerformedPeriod(
  value: string,
): value is VisitsPerformedPeriod {
  return (VISITS_PERFORMED_PERIODS as readonly string[]).includes(value);
}

export function parseVisitsPerformedPeriod(
  raw: string | undefined,
  fallback: VisitsPerformedPeriod = "week",
): VisitsPerformedPeriod {
  return raw && isVisitsPerformedPeriod(raw) ? raw : fallback;
}

export function visitsPerformedHelperText(period: VisitsPerformedPeriod): string {
  return (
    VISITS_PERFORMED_PERIOD_OPTIONS.find((option) => option.value === period)
      ?.helper ?? VISITS_PERFORMED_PERIOD_OPTIONS[0].helper
  );
}

export function visitsPerformedHasData(
  buckets: VisitsPerformedBucket[],
): boolean {
  return buckets.some((bucket) => bucket.count > 0);
}

function lastNDayKeys(
  n: number,
  timeZone: string,
  reference: Date,
): string[] {
  const end = todayKey(reference, timeZone);
  return Array.from({ length: n }, (_, index) =>
    addCalendarDays(end, -(n - 1 - index), timeZone),
  );
}

function lastNIsoWeekMondayKeys(
  n: number,
  timeZone: string,
  reference: Date,
): string[] {
  const today = todayKey(reference, timeZone);
  let monday = startOfIsoWeekMonday(today, timeZone);
  const keys: string[] = [];
  for (let i = 0; i < n; i += 1) {
    keys.unshift(monday);
    monday = addCalendarDays(monday, -7, timeZone);
  }
  return keys;
}

function lastNMonthKeys(
  n: number,
  timeZone: string,
  reference: Date,
): string[] {
  const today = todayKey(reference, timeZone);
  let year = Number.parseInt(today.slice(0, 4), 10);
  let month = Number.parseInt(today.slice(5, 7), 10);
  const keys: string[] = [];
  for (let i = 0; i < n; i += 1) {
    keys.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

function ytdMonthKeys(timeZone: string, reference: Date): string[] {
  const today = todayKey(reference, timeZone);
  const year = today.slice(0, 4);
  const currentMonth = Number.parseInt(today.slice(5, 7), 10);
  return Array.from({ length: currentMonth }, (_, index) => {
    const month = index + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

function formatDayLabel(dayKey: string, timeZone: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "short",
  })
    .format(base)
    .replace(/\.$/, "");
  return `${weekday} ${day}`;
}

function formatWeekLabel(mondayKey: string, timeZone: string): string {
  const sundayKey = addCalendarDays(mondayKey, 6, timeZone);
  const [, startMonth, startDay] = mondayKey.split("-");
  const [, endMonth, endDay] = sundayKey.split("-");
  if (startMonth === endMonth) {
    return `${Number(startDay)}–${Number(endDay)}/${startMonth}`;
  }
  return `${Number(startDay)}/${startMonth}–${Number(endDay)}/${endMonth}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number.parseInt(month, 10) - 1;
  return `${MONTHS_PT[monthIndex]}/${year.slice(2)}`;
}

function bucketKeysForPeriod(
  period: VisitsPerformedPeriod,
  timeZone: string,
  reference: Date,
): { keys: string[]; granularity: "day" | "week" | "month" } {
  if (period === "week") {
    return { keys: lastNDayKeys(7, timeZone, reference), granularity: "day" };
  }
  if (period === "month") {
    return {
      keys: lastNIsoWeekMondayKeys(4, timeZone, reference),
      granularity: "week",
    };
  }
  if (period === "3m") {
    return { keys: lastNMonthKeys(3, timeZone, reference), granularity: "month" };
  }
  if (period === "6m") {
    return { keys: lastNMonthKeys(6, timeZone, reference), granularity: "month" };
  }
  if (period === "1y") {
    return { keys: lastNMonthKeys(12, timeZone, reference), granularity: "month" };
  }
  return { keys: ytdMonthKeys(timeZone, reference), granularity: "month" };
}

function dayToBucketKey(
  dayKey: string,
  granularity: "day" | "week" | "month",
  keys: ReadonlySet<string>,
  timeZone: string,
): string | null {
  if (granularity === "day") {
    return keys.has(dayKey) ? dayKey : null;
  }
  if (granularity === "month") {
    const monthKey = dayKey.slice(0, 7);
    return keys.has(monthKey) ? monthKey : null;
  }
  for (const monday of keys) {
    const sunday = addCalendarDays(monday, 6, timeZone);
    if (dayKey >= monday && dayKey <= sunday) {
      return monday;
    }
  }
  return null;
}

function labelForBucket(
  key: string,
  granularity: "day" | "week" | "month",
  timeZone: string,
): string {
  if (granularity === "day") return formatDayLabel(key, timeZone);
  if (granularity === "week") return formatWeekLabel(key, timeZone);
  return formatMonthLabel(key);
}

export function periodLabelForVisitsPerformed(
  period: VisitsPerformedPeriod,
): string {
  return (
    VISITS_PERFORMED_PERIOD_OPTIONS.find((option) => option.value === period)
      ?.label ?? "Semana"
  );
}

export type VisitPerformedInPeriod = VisitPerformedInput & {
  bucketKey: string;
  bucketLabel: string;
};

/** Visitas concluídas que entram nas barras do período selecionado. */
export function listVisitsInPerformedPeriod(
  visits: VisitPerformedInput[],
  timeZone: string,
  period: VisitsPerformedPeriod,
  reference: Date = new Date(),
): VisitPerformedInPeriod[] {
  const { keys, granularity } = bucketKeysForPeriod(period, timeZone, reference);
  const keySet = new Set(keys);
  const listed: VisitPerformedInPeriod[] = [];

  for (const visit of visits) {
    if (visit.status !== "completed") continue;
    const dayKey = visitDayKey(visit.scheduled_start, timeZone);
    const bucketKey = dayToBucketKey(dayKey, granularity, keySet, timeZone);
    if (!bucketKey) continue;
    listed.push({
      ...visit,
      bucketKey,
      bucketLabel: labelForBucket(bucketKey, granularity, timeZone),
    });
  }

  return listed.sort(
    (a, b) =>
      new Date(a.scheduled_start).getTime() -
      new Date(b.scheduled_start).getTime(),
  );
}

/**
 * Conta visitas concluídas no fuso do perfil, por período do gráfico.
 */
export function buildVisitsPerformedSeries(
  visits: VisitPerformedInput[],
  timeZone: string,
  period: VisitsPerformedPeriod,
  reference: Date = new Date(),
): VisitsPerformedBucket[] {
  const { keys, granularity } = bucketKeysForPeriod(period, timeZone, reference);
  const keySet = new Set(keys);
  const counts = new Map<string, number>(keys.map((key) => [key, 0]));

  for (const visit of visits) {
    if (visit.status !== "completed") continue;
    const dayKey = visitDayKey(visit.scheduled_start, timeZone);
    const bucketKey = dayToBucketKey(dayKey, granularity, keySet, timeZone);
    if (!bucketKey) continue;
    counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
  }

  return keys.map((key) => ({
    key,
    label: labelForBucket(key, granularity, timeZone),
    count: counts.get(key) ?? 0,
  }));
}
