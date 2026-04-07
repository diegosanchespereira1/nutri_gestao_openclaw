import { describe, expect, it } from "vitest";

import {
  FIN_CHART_QUERY,
  normalizeRangeDayKeys,
  parseChartWindow,
  serializeChartWindow,
} from "./chart-window";

describe("normalizeRangeDayKeys", () => {
  it("ordena e limita ao hoje", () => {
    const r = normalizeRangeDayKeys("2026-04-01", "2026-01-01", "2026-04-06");
    expect(r).toEqual({ fromDayKey: "2026-01-01", toDayKey: "2026-04-01" });
  });
  it("recusa datas inválidas", () => {
    expect(normalizeRangeDayKeys("nope", "2026-01-01", "2026-04-06")).toBeNull();
  });
});

describe("parseChartWindow", () => {
  const pick =
    (q: Record<string, string>) =>
    (k: string): string | undefined =>
      q[k];

  it("modo meses por omissão e m_*", () => {
    const w = parseChartWindow(
      FIN_CHART_QUERY.rec,
      pick({ m_rec: "12" }),
      "2026-04-06",
    );
    expect(w).toEqual({ mode: "months", months: 12 });
  });

  it("total", () => {
    const w = parseChartWindow(
      FIN_CHART_QUERY.rec,
      pick({ win_rec: "total" }),
      "2026-04-06",
    );
    expect(w).toEqual({ mode: "total" });
  });

  it("intervalo", () => {
    const w = parseChartWindow(
      FIN_CHART_QUERY.rec,
      pick({
        win_rec: "range",
        from_rec: "2026-01-10",
        to_rec: "2026-03-01",
      }),
      "2026-04-06",
    );
    expect(w).toEqual({
      mode: "range",
      fromDayKey: "2026-01-10",
      toDayKey: "2026-03-01",
    });
  });
});

describe("serializeChartWindow", () => {
  it("emite chaves coerentes com parse", () => {
    const keys = FIN_CHART_QUERY.flux;
    const w = { mode: "months" as const, months: 6 as const };
    expect(serializeChartWindow(keys, w)).toEqual({
      win_flux: "months",
      m_flux: "6",
    });
  });
});
