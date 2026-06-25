import { describe, expect, it } from "vitest";

import {
  CHILD_COLOR_CLASSES,
  CHILD_COLOR_HEX,
  CHILD_INDICATOR_LABELS,
  CHILD_INDICATOR_SHORT,
  CHILD_INDICATOR_UNIT,
  CHILD_METHOD_LABELS,
} from "@/lib/nutrition/child/labels";

describe("child labels", () => {
  it("rótulos completos para todos os indicadores", () => {
    expect(CHILD_INDICATOR_LABELS.bmi_for_age).toContain("IMC");
    expect(Object.keys(CHILD_INDICATOR_LABELS)).toHaveLength(8);
  });

  it("siglas curtas", () => {
    expect(CHILD_INDICATOR_SHORT.bmi_for_age).toBe("IMC/I");
  });

  it("unidades", () => {
    expect(CHILD_INDICATOR_UNIT.weight_for_age).toBe("kg");
  });

  it("métodos", () => {
    expect(CHILD_METHOD_LABELS.percentile).toBe("Percentil");
  });

  it("cores semáforo", () => {
    expect(CHILD_COLOR_HEX.green).toMatch(/^#/);
    expect(CHILD_COLOR_CLASSES.red).toContain("red");
  });
});
