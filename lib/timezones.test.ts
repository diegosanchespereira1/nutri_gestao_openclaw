import { describe, expect, it } from "vitest";

import {
  ALLOWED_APP_TIME_ZONES,
  DEFAULT_PROFILE_TIME_ZONE,
  normalizeAppTimeZone,
} from "@/lib/timezones";

describe("timezones", () => {
  it("normaliza fuso válido", () => {
    expect(normalizeAppTimeZone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
  });

  it("fallback para inválido", () => {
    expect(normalizeAppTimeZone("Invalid/Zone")).toBe(DEFAULT_PROFILE_TIME_ZONE);
  });

  it("default é São Paulo (Brasil)", () => {
    expect(DEFAULT_PROFILE_TIME_ZONE).toBe("America/Sao_Paulo");
  });

  it("lista contém São Paulo", () => {
    expect(ALLOWED_APP_TIME_ZONES.has("America/Sao_Paulo")).toBe(true);
  });
});
