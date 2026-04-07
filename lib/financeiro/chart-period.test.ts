import { describe, expect, it } from "vitest";

import { parseChartMonths } from "./chart-period";

describe("parseChartMonths", () => {
  it("aceita valores válidos", () => {
    expect(parseChartMonths("12", 6)).toBe(12);
    expect(parseChartMonths("3", 6)).toBe(3);
  });
  it("fallback para inválido", () => {
    expect(parseChartMonths(undefined, 6)).toBe(6);
    expect(parseChartMonths("99", 6)).toBe(6);
    expect(parseChartMonths("", 6)).toBe(6);
  });
});
