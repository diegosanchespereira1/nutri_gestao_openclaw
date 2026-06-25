import { describe, expect, it } from "vitest";

import { computeBmi } from "@/lib/utils/bmi";

describe("computeBmi", () => {
  it("calcula IMC válido", () => {
    expect(computeBmi(170, 70)).toBe(24.2);
  });

  it("devolve null para altura zero", () => {
    expect(computeBmi(0, 70)).toBeNull();
  });

  it("devolve null para peso negativo", () => {
    expect(computeBmi(170, -1)).toBeNull();
  });
});
