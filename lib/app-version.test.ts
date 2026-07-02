import { describe, expect, it } from "vitest";

import {
  formatAppVersionLabel,
  formatAppVersionTitle,
  getAppVersion,
  parseSemver,
} from "@/lib/app-version";
import { readPackageVersion } from "@/lib/app-version-package";
import { getServerAppVersion } from "@/lib/app-version-server";

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

  it("readPackageVersion devolve semver do package.json", () => {
    expect(readPackageVersion()).toBe("1.2.24");
  });

  it("getServerAppVersion devolve semver do package.json em ambiente de teste", () => {
    expect(getServerAppVersion()).toBe("1.2.24");
  });

  it("getAppVersion usa NEXT_PUBLIC_APP_VERSION quando definida", () => {
    const prev = process.env.NEXT_PUBLIC_APP_VERSION;
    process.env.NEXT_PUBLIC_APP_VERSION = "9.8.7";
    try {
      expect(getAppVersion()).toBe("9.8.7");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
      else process.env.NEXT_PUBLIC_APP_VERSION = prev;
    }
  });
});
