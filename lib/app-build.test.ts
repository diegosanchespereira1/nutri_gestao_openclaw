import { describe, expect, it } from "vitest";

import { formatAppBuildLabel, getAppBuildId } from "@/lib/app-build";

describe("app-build", () => {
  it("formatAppBuildLabel encurta SHAs longos", () => {
    expect(formatAppBuildLabel("a1b2c3d4e5f6789012345678")).toBe("a1b2c3d");
  });

  it("getAppBuildId devolve string não vazia", () => {
    expect(getAppBuildId().length).toBeGreaterThan(0);
  });
});
