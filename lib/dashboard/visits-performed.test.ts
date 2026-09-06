import { describe, expect, it } from "vitest";

import {
  buildVisitsPerformedSeries,
  listVisitsInPerformedPeriod,
  parseVisitsPerformedPeriod,
  visitsPerformedHasData,
} from "@/lib/dashboard/visits-performed";

const TZ = "America/Sao_Paulo";
const REF = new Date("2026-09-06T15:00:00Z");

function visit(scheduledStart: string, status = "completed") {
  return {
    scheduled_start: scheduledStart,
    status,
    assigned_team_member_id: null,
    user_id: "00000000-0000-4000-8000-000000000000",
  };
}

describe("parseVisitsPerformedPeriod", () => {
  it("usa semana como padrão", () => {
    expect(parseVisitsPerformedPeriod(undefined)).toBe("week");
    expect(parseVisitsPerformedPeriod("nope")).toBe("week");
  });

  it("aceita períodos válidos", () => {
    expect(parseVisitsPerformedPeriod("ytd")).toBe("ytd");
  });
});

describe("buildVisitsPerformedSeries", () => {
  it("semana: 7 dias e só visitas concluídas", () => {
    const buckets = buildVisitsPerformedSeries(
      [
        visit("2026-09-05T18:00:00Z"),
        visit("2026-09-05T20:00:00Z", "scheduled"),
        visit("2026-09-04T18:00:00Z", "cancelled"),
        visit("2026-08-30T18:00:00Z"),
      ],
      TZ,
      "week",
      REF,
    );

    expect(buckets).toHaveLength(7);
    expect(buckets[0]?.key).toBe("2026-08-31");
    expect(buckets[6]?.key).toBe("2026-09-06");
    expect(buckets.find((bucket) => bucket.key === "2026-09-05")?.count).toBe(1);
    expect(buckets.every((bucket) => bucket.key !== "2026-08-30")).toBe(true);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });

  it("mês: 4 semanas ISO incluindo a semana atual", () => {
    const buckets = buildVisitsPerformedSeries(
      [
        visit("2026-09-06T15:00:00Z"),
        visit("2026-08-12T15:00:00Z"),
        visit("2026-08-09T15:00:00Z"),
      ],
      TZ,
      "month",
      REF,
    );

    expect(buckets).toHaveLength(4);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(buckets[0]?.count).toBe(1);
    expect(buckets[3]?.count).toBe(1);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2);
  });

  it("3, 6 e 12 meses usam meses civis", () => {
    const three = buildVisitsPerformedSeries([], TZ, "3m", REF);
    const six = buildVisitsPerformedSeries([], TZ, "6m", REF);
    const year = buildVisitsPerformedSeries(
      [
        visit("2025-10-01T15:00:00Z"),
        visit("2025-09-15T15:00:00Z"),
      ],
      TZ,
      "1y",
      REF,
    );

    expect(three.map((bucket) => bucket.key)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(six).toHaveLength(6);
    expect(year).toHaveLength(12);
    expect(year[0]?.key).toBe("2025-10");
    expect(year[0]?.count).toBe(1);
    expect(year.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });

  it("YTD vai de janeiro até o mês atual e ignora o ano anterior", () => {
    const buckets = buildVisitsPerformedSeries(
      [
        visit("2026-01-10T15:00:00Z"),
        visit("2025-12-31T15:00:00Z"),
      ],
      TZ,
      "ytd",
      REF,
    );

    expect(buckets).toHaveLength(9);
    expect(buckets[0]?.key).toBe("2026-01");
    expect(buckets[8]?.key).toBe("2026-09");
    expect(buckets[0]?.count).toBe(1);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });
});

describe("listVisitsInPerformedPeriod", () => {
  it("exporta só as visitas que entram nas barras da semana", () => {
    const listed = listVisitsInPerformedPeriod(
      [
        visit("2026-09-05T18:00:00Z"),
        visit("2026-09-05T20:00:00Z", "scheduled"),
        visit("2026-08-30T18:00:00Z"),
      ],
      TZ,
      "week",
      REF,
    );

    expect(listed).toHaveLength(1);
    expect(listed[0]?.scheduled_start).toBe("2026-09-05T18:00:00Z");
    expect(listed[0]?.bucketKey).toBe("2026-09-05");
  });
});

describe("visitsPerformedHasData", () => {
  it("true se algum bucket tem count", () => {
    expect(
      visitsPerformedHasData([
        { key: "2026-09", label: "set/26", count: 0 },
        { key: "2026-08", label: "ago/26", count: 2 },
      ]),
    ).toBe(true);
  });

  it("false se todos zero", () => {
    expect(
      visitsPerformedHasData([{ key: "2026-09", label: "set/26", count: 0 }]),
    ).toBe(false);
  });
});
