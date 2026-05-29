import { describe, expect, it } from "vitest";

import {
  formatAppVersionLabel,
  formatAppVersionTitle,
  getAppVersion,
  parseSemver,
} from "@/lib/app-version";

describe("app-version", () => {
  it("parseSemver aceita semver básico", () => {
    expect(parseSemver("1.0.3")).toEqual({ major: 1, minor: 0, patch: 3 });
  });

  it("formatAppVersionLabel usa semver completo", () => {
    expect(formatAppVersionLabel("1.0.10")).toBe("V 1.0.10");
    expect(formatAppVersionLabel("2.4.1")).toBe("V 2.4.1");
  });

  it("formatAppVersionTitle mostra patch", () => {
    expect(formatAppVersionTitle("1.0.3")).toBe("Versão 1.0.3");
  });

  it("getAppVersion devolve string não vazia", () => {
    expect(getAppVersion().length).toBeGreaterThan(0);
  });
});
