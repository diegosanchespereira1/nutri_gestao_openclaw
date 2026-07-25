import { describe, expect, it } from "vitest";

import {
  HEALTH_INDICATOR_SECTIONS,
  deltaFromSeries,
  formatIndicatorValue,
  sliceLastN,
} from "@/lib/pacientes/health-indicator-series";

describe("health-indicator-series", () => {
  it("sliceLastN respeita ASC e período", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(sliceLastN(items, 3)).toEqual([4, 5, 6]);
    expect(sliceLastN(items, "all")).toEqual(items);
  });

  it("deltaFromSeries calcula variação vs. anterior", () => {
    expect(deltaFromSeries([10, 11])).toEqual({
      kind: "up",
      text: "+1,0 vs. ant.",
    });
    expect(deltaFromSeries([11, 10])).toEqual({
      kind: "down",
      text: "−1,0 vs. ant.",
    });
    expect(deltaFromSeries([10, 10]).kind).toBe("flat");
  });

  it("formatIndicatorValue usa vírgula pt-BR e inteiros", () => {
    expect(formatIndicatorValue(24.2, 1)).toBe("24,2");
    expect(formatIndicatorValue(2052.4, 0, true)).toBe("2.052");
    expect(formatIndicatorValue(null, 1)).toBe("–");
  });

  it("cobre todos os campos antropométricos essenciais nas seções", () => {
    const ids = HEALTH_INDICATOR_SECTIONS.flatMap((s) =>
      s.indicators.map((i) => i.id),
    );
    for (const required of [
      "cb",
      "dct",
      "cp",
      "aj",
      "cmb",
      "pr",
      "pe",
      "ae",
      "imc",
      "kcal",
      "ptn",
      "ne",
      "np",
      "rn",
      "dx",
      "grp",
      "amp",
    ]) {
      expect(ids).toContain(required);
    }
  });
});
