import { describe, expect, it } from "vitest";

import { nextPopVersionNumber } from "./next-pop-version";

describe("nextPopVersionNumber", () => {
  it("primeira versão é 1", () => {
    expect(nextPopVersionNumber([])).toBe(1);
  });

  it("incrementa a partir do máximo existente", () => {
    expect(nextPopVersionNumber([1, 2, 3])).toBe(4);
    expect(nextPopVersionNumber([1, 5, 2])).toBe(6);
  });
});
