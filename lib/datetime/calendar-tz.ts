/** Calendário civil e formatação para um fuso IANA (agenda / visitas). */

export function formatDateTimeShort(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoUtc));
}

export function isSameCalendarDay(
  isoUtc: string,
  timeZone: string,
  reference: Date = new Date(),
): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(isoUtc)) === fmt.format(reference);
}

export function visitDayKey(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

/** «Hoje» (civil) no fuso dado — preferir referência do servidor para hidratação. */
export function todayKey(reference: Date, timeZone: string): string {
  return visitDayKey(reference.toISOString(), timeZone);
}

export function formatTimeShort(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoUtc));
}

export function addCalendarDays(
  dayKey: string,
  delta: number,
  timeZone: string,
): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + delta);
  return visitDayKey(base.toISOString(), timeZone);
}

const WEEKDAY_MON0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function mondayIndexFromDayKey(dayKey: string, timeZone: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(base);
  return WEEKDAY_MON0[short] ?? 0;
}

export function startOfIsoWeekMonday(
  dayKey: string,
  timeZone: string,
): string {
  const idx = mondayIndexFromDayKey(dayKey, timeZone);
  return addCalendarDays(dayKey, -idx, timeZone);
}

export function weekDayKeysFromMonday(
  mondayKey: string,
  timeZone: string,
): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    addCalendarDays(mondayKey, i, timeZone),
  );
}

export function formatWeekdayShortDay(
  dayKey: string,
  timeZone: string,
): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    weekday: "short",
    day: "numeric",
  }).format(base);
}

export function formatWeekRangeLabel(
  mondayKey: string,
  timeZone: string,
): string {
  const sunKey = addCalendarDays(mondayKey, 6, timeZone);
  const [y1, m1, d1] = mondayKey.split("-").map(Number);
  const [y2, m2, d2] = sunKey.split("-").map(Number);
  const start = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
  const end = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
  const sameMonth = m1 === m2 && y1 === y2;
  const fmtDay = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    day: "numeric",
  });
  const fmtMon = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    month: "short",
  });
  const fmtYear = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    year: "numeric",
  });
  if (sameMonth) {
    return `${fmtDay.format(start)}–${fmtDay.format(end)} ${fmtMon.format(end)} ${fmtYear.format(end)}`;
  }
  return `${fmtDay.format(start)} ${fmtMon.format(start)} – ${fmtDay.format(end)} ${fmtMon.format(end)} ${fmtYear.format(end)}`;
}

function firstOfMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function monthCalendarCells(
  monthAnchorKey: string,
  timeZone: string,
): { key: string; inMonth: boolean }[] {
  const [y, m] = monthAnchorKey.split("-").map(Number);
  const first = firstOfMonthKey(y, m);
  const monIdx = mondayIndexFromDayKey(first, timeZone);
  const gridStart = addCalendarDays(first, -monIdx, timeZone);
  const prefix = `${y}-${String(m).padStart(2, "0")}-`;
  return Array.from({ length: 42 }, (_, i) => {
    const k = addCalendarDays(gridStart, i, timeZone);
    return { key: k, inMonth: k.startsWith(prefix) };
  });
}

export function formatMonthYearTitle(dayKey: string, timeZone: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(base);
}

export function minutesSinceMidnight(isoUtc: string, timeZone: string): number {
  const d = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = Number.parseInt(p.value, 10);
    if (p.type === "minute") minute = Number.parseInt(p.value, 10);
  }
  return hour * 60 + minute;
}

export function formatDayColumnHeader(dayKey: string, timeZone: string): string {
  const [y, m, dd] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, dd, 12, 0, 0));
  const wd = new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    weekday: "short",
  }).format(base);
  return `${wd} ${dd}/${m}`;
}

/** Diferença em dias civis entre duas chaves `YYYY-MM-DD` (to − from). */
export function diffCalendarDayKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

/**
 * Dias até a data limite no calendário civil do fuso (positivo = futuro, 0 = hoje, negativo = atraso).
 */
export function calendarDaysUntilDueDate(
  dueDateKey: string,
  timeZone: string,
  reference: Date = new Date(),
): number {
  const tKey = todayKey(reference, timeZone);
  return diffCalendarDayKeys(tKey, dueDateKey);
}

/** Data longa (civil) para uma chave `YYYY-MM-DD` no fuso dado. */
export function formatDayKeyLong(dayKey: string, timeZone: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    dateStyle: "long",
  }).format(base);
}
