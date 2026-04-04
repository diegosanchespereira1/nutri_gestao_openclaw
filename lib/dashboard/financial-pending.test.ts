import { describe, expect, it } from "vitest";

import {
  formatBRLFromCents,
  isCalendarDayKeyBefore,
  isOpenOverdue,
  summarizeOverdueCharges,
} from "./financial-pending";

describe("isCalendarDayKeyBefore", () => {
  it("ordena corretamente datas ISO", () => {
    expect(isCalendarDayKeyBefore("2026-01-01", "2026-01-02")).toBe(true);
    expect(isCalendarDayKeyBefore("2026-01-02", "2026-01-02")).toBe(false);
    expect(isCalendarDayKeyBefore("2026-02-01", "2026-01-31")).toBe(false);
  });
});

describe("isOpenOverdue", () => {
  it("identifica em atraso só para open com vencimento antes de hoje", () => {
    expect(isOpenOverdue("2026-01-01", "2026-04-04", "open")).toBe(true);
    expect(isOpenOverdue("2026-04-04", "2026-04-04", "open")).toBe(false);
    expect(isOpenOverdue("2026-05-01", "2026-04-04", "open")).toBe(false);
    expect(isOpenOverdue("2026-01-01", "2026-04-04", "paid")).toBe(false);
  });
});

describe("summarizeOverdueCharges", () => {
  it("soma apenas linhas em atraso e abertas", () => {
    const r = summarizeOverdueCharges(
      [
        { due_date: "2026-01-01", amount_cents: 1000, status: "open" },
        { due_date: "2026-01-02", amount_cents: 500, status: "open" },
        { due_date: "2026-01-01", amount_cents: 9999, status: "paid" },
        { due_date: "2030-01-01", amount_cents: 100, status: "open" },
      ],
      "2026-06-01",
    );
    expect(r.overdueCount).toBe(2);
    expect(r.overdueTotalCents).toBe(1500);
  });
});

describe("formatBRLFromCents", () => {
  it("formata em pt-BR", () => {
    const s = formatBRLFromCents(12345);
    expect(s).toContain("123");
    expect(s).toContain("45");
  });
});
