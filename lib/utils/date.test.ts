import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDateBR,
  formatDateTimeBR,
  formatRelativeTime,
  isInQuietHours,
} from "@/lib/utils/date";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devolve "agora" para menos de 1 minuto', () => {
    expect(formatRelativeTime("2026-06-20T11:59:30Z")).toBe("agora");
  });

  it("devolve minutos", () => {
    expect(formatRelativeTime("2026-06-20T11:58:00Z")).toBe("há 2 minutos");
  });

  it("devolve ontem", () => {
    expect(formatRelativeTime("2026-06-19T12:00:00Z")).toBe("ontem");
  });

  it("devolve semanas", () => {
    expect(formatRelativeTime("2026-06-06T12:00:00Z")).toContain("semana");
  });
});

describe("formatDateBR", () => {
  it("formata data local", () => {
    const s = formatDateBR("2026-03-15T15:00:00");
    expect(s).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });
});

describe("formatDateTimeBR", () => {
  it("inclui hora", () => {
    expect(formatDateTimeBR("2026-03-15T15:30:00")).toContain(":");
  });
});

describe("isInQuietHours", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detecta quiet hours no mesmo dia", () => {
    vi.setSystemTime(new Date("2026-06-20T23:30:00"));
    expect(isInQuietHours("22:00", "08:00")).toBe(true);
  });

  it("fora de quiet hours", () => {
    vi.setSystemTime(new Date("2026-06-20T14:00:00"));
    expect(isInQuietHours("22:00", "08:00")).toBe(false);
  });
});
