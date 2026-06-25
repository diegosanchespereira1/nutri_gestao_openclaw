import { describe, expect, it } from "vitest";

import {
  CHART_PALETTE,
  CLINICAL_COLORS,
  COMPLIANCE_COLORS,
  FINANCIAL_COLORS,
  VISITS_COLORS,
} from "@/lib/chart-colors";

describe("chart-colors", () => {
  it("paletas semânticas definidas", () => {
    expect(COMPLIANCE_COLORS.conforme).toMatch(/^#/);
    expect(CLINICAL_COLORS.weight).toMatch(/^#/);
    expect(FINANCIAL_COLORS.receita).toMatch(/^#/);
    expect(VISITS_COLORS.realizadas).toMatch(/^#/);
  });

  it("CHART_PALETTE tem entradas", () => {
    expect(CHART_PALETTE.length).toBeGreaterThanOrEqual(4);
  });
});
