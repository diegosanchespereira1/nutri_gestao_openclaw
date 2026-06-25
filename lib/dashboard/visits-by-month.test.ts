import { describe, expect, it } from "vitest";

import {
  buildVisitsByMonthSeries,
  visitsByMonthHasData,
} from "@/lib/dashboard/visits-by-month";

const TZ = "America/Sao_Paulo";

describe("buildVisitsByMonthSeries", () => {
  it("conta visitas por mês", () => {
    const ref = new Date("2026-06-20T12:00:00Z");
    const buckets = buildVisitsByMonthSeries(
      [
        {
          status: "scheduled",
          scheduled_start: "2026-06-15T10:00:00Z",
        } as never,
        {
          status: "cancelled",
          scheduled_start: "2026-06-10T10:00:00Z",
        } as never,
      ],
      TZ,
      3,
      ref,
    );
    expect(buckets).toHaveLength(3);
    expect(buckets.some((b) => b.count > 0)).toBe(true);
  });
});

describe("visitsByMonthHasData", () => {
  it("true se algum bucket tem count", () => {
    expect(
      visitsByMonthHasData([
        { monthKey: "2026-06", label: "jun", count: 0 },
        { monthKey: "2026-05", label: "mai", count: 2 },
      ]),
    ).toBe(true);
  });

  it("false se todos zero", () => {
    expect(
      visitsByMonthHasData([
        { monthKey: "2026-06", label: "jun", count: 0 },
      ]),
    ).toBe(false);
  });
});
