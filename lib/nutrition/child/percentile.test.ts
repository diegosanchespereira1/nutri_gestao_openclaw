import { describe, expect, it } from "vitest";

import { percentileForValue, valueForPercentile } from "./percentile";

// IMC meninas, 61 meses (5a1m) — valores reais do documento.
const row = [12.4, 12.9, 13.1, 13.8, 14.3, 15.2, 16.3, 16.9, 18.1, 18.6, 19.6] as const;

describe("percentileForValue", () => {
  it("valor igual à coluna P50 → percentil 50", () => {
    expect(percentileForValue(15.2, row).percentile).toBe(50);
  });

  it("valor igual à coluna P85 → percentil 85", () => {
    expect(percentileForValue(16.9, row).percentile).toBe(85);
  });

  it("interpola entre P50 e P75", () => {
    // 15.75 fica na metade entre 15.2 (P50) e 16.3 (P75) → ~62.5
    expect(percentileForValue(15.75, row).percentile).toBeCloseTo(62.5, 1);
  });

  it("abaixo de P1 → boundary below_p1", () => {
    expect(percentileForValue(11.0, row)).toEqual({
      percentile: null,
      boundary: "below_p1",
    });
  });

  it("acima de P99 → boundary above_p99", () => {
    expect(percentileForValue(20.0, row)).toEqual({
      percentile: null,
      boundary: "above_p99",
    });
  });

  it("valor não-finito → percentil null sem boundary", () => {
    expect(percentileForValue(Number.NaN, row)).toEqual({
      percentile: null,
      boundary: null,
    });
  });
});

describe("valueForPercentile", () => {
  it("devolve o número tabelado da coluna pedida", () => {
    expect(valueForPercentile("p50", row)).toBe(15.2);
    expect(valueForPercentile("p3", row)).toBe(12.9);
    expect(valueForPercentile("p97", row)).toBe(18.6);
  });
});
