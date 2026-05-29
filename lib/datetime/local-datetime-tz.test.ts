import { describe, expect, it } from "vitest";

import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";

describe("localDateTimeInTimeZoneToUtcIso", () => {
  it("converte horário de São Paulo para UTC", () => {
    expect(
      localDateTimeInTimeZoneToUtcIso(
        "2026-05-29T14:30",
        "America/Sao_Paulo",
      ),
    ).toBe("2026-05-29T17:30:00.000Z");
  });

  it("converte horário de Lisboa no inverno (WET)", () => {
    expect(
      localDateTimeInTimeZoneToUtcIso("2026-01-15T10:00", "Europe/Lisbon"),
    ).toBe("2026-01-15T10:00:00.000Z");
  });

  it("converte horário de Lisboa no verão (WEST)", () => {
    expect(
      localDateTimeInTimeZoneToUtcIso("2026-07-15T10:00", "Europe/Lisbon"),
    ).toBe("2026-07-15T09:00:00.000Z");
  });

  it("rejeita formato inválido", () => {
    expect(
      localDateTimeInTimeZoneToUtcIso("29/05/2026 14:30", "Europe/Lisbon"),
    ).toBeNull();
  });
});
