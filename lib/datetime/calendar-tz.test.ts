import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  calendarDaysUntilDueDate,
  diffCalendarDayKeys,
  formatDayColumnHeader,
  formatDayKeyLong,
  formatMonthYearTitle,
  formatTimeShort,
  formatWeekRangeLabel,
  formatWeekdayShortDay,
  isSameCalendarDay,
  minutesSinceMidnight,
  monthCalendarCells,
  startOfIsoWeekMonday,
  todayKey,
  visitDayKey,
  weekDayKeysFromMonday,
  formatDateTimeShort,
} from "@/lib/datetime/calendar-tz";

const TZ = "America/Sao_Paulo";

describe("visitDayKey", () => {
  it("devolve YYYY-MM-DD", () => {
    expect(visitDayKey("2026-06-20T15:00:00Z", TZ)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isSameCalendarDay", () => {
  it("compara dia civil no fuso", () => {
    const ref = new Date("2026-06-20T12:00:00Z");
    expect(
      isSameCalendarDay("2026-06-20T03:00:00Z", TZ, ref),
    ).toBe(true);
  });
});

describe("addCalendarDays e diffCalendarDayKeys", () => {
  it("soma dias no calendário", () => {
    const next = addCalendarDays("2026-06-20", 1, TZ);
    expect(diffCalendarDayKeys("2026-06-20", next)).toBe(1);
  });
});

describe("startOfIsoWeekMonday", () => {
  it("segunda-feira para uma quarta", () => {
    const mon = startOfIsoWeekMonday("2026-06-18", TZ);
    expect(weekDayKeysFromMonday(mon, TZ)).toHaveLength(7);
  });
});

describe("monthCalendarCells", () => {
  it("devolve grelha de 42 células", () => {
    expect(monthCalendarCells("2026-06-15", TZ)).toHaveLength(42);
  });
});

describe("minutesSinceMidnight", () => {
  it("calcula minutos", () => {
    const m = minutesSinceMidnight("2026-06-20T12:30:00Z", TZ);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(24 * 60);
  });
});

describe("calendarDaysUntilDueDate", () => {
  it("conta dias até vencimento", () => {
    const ref = new Date("2026-06-20T12:00:00Z");
    const today = todayKey(ref, TZ);
    const due = addCalendarDays(today, 3, TZ);
    expect(calendarDaysUntilDueDate(due, TZ, ref)).toBe(3);
  });
});

describe("formatDayKeyLong", () => {
  it("formata data longa", () => {
    expect(formatDayKeyLong("2026-06-20", TZ).length).toBeGreaterThan(5);
  });
});

describe("formatDateTimeShort e formatTimeShort", () => {
  it("formata data/hora", () => {
    expect(formatDateTimeShort("2026-06-20T15:00:00Z", TZ)).toBeTruthy();
    expect(formatTimeShort("2026-06-20T15:00:00Z", TZ)).toMatch(/\d/);
  });
});

describe("formatWeekRangeLabel", () => {
  it("intervalo no mesmo mês", () => {
    const mon = startOfIsoWeekMonday("2026-06-18", TZ);
    expect(formatWeekRangeLabel(mon, TZ)).toContain("2026");
  });
});

describe("formatWeekdayShortDay e formatDayColumnHeader", () => {
  it("formata cabeçalhos", () => {
    expect(formatWeekdayShortDay("2026-06-20", TZ)).toBeTruthy();
    expect(formatDayColumnHeader("2026-06-20", TZ)).toContain("/");
  });
});

describe("formatMonthYearTitle", () => {
  it("título do mês", () => {
    expect(formatMonthYearTitle("2026-06-15", TZ).toLowerCase()).toContain("2026");
  });
});

describe("monthCalendarCells inMonth", () => {
  it("marca dias fora do mês", () => {
    const cells = monthCalendarCells("2026-06-15", TZ);
    expect(cells.some((c) => !c.inMonth)).toBe(true);
    expect(cells.some((c) => c.inMonth)).toBe(true);
  });
});
