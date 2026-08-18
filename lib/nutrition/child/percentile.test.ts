import { describe, expect, it } from "vitest";

import {
  findNearestTabulatedPercentile,
  percentileForValue,
  valueForPercentile,
} from "./percentile";

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

describe("findNearestTabulatedPercentile", () => {
  it("48.5 → P50 (coluna mais próxima)", () => {
    expect(findNearestTabulatedPercentile(48.5)).toEqual({
      key: "p50",
      percentileNumber: 50,
    });
  });

  it("percentil exato coincide com a coluna", () => {
    expect(findNearestTabulatedPercentile(50)?.key).toBe("p50");
    expect(findNearestTabulatedPercentile(85)?.key).toBe("p85");
    expect(findNearestTabulatedPercentile(1)?.key).toBe("p1");
    expect(findNearestTabulatedPercentile(99)?.key).toBe("p99");
  });

  it("valores próximos dos extremos", () => {
    expect(findNearestTabulatedPercentile(1.4)?.key).toBe("p1");
    expect(findNearestTabulatedPercentile(98.4)?.key).toBe("p99");
    expect(findNearestTabulatedPercentile(0.2)?.key).toBe("p1");
    expect(findNearestTabulatedPercentile(99.9)?.key).toBe("p99");
  });

  it("empate exato resolve para a coluna menor", () => {
    // 2.0 está a 1 de P1 e a 1 de P3 → P1 (primeira encontrada).
    expect(findNearestTabulatedPercentile(2)?.key).toBe("p1");
    // 4.0 está a 1 de P3 e a 1 de P5 → P3.
    expect(findNearestTabulatedPercentile(4)?.key).toBe("p3");
  });

  it("meio da faixa larga P5–P15", () => {
    expect(findNearestTabulatedPercentile(9.9)?.key).toBe("p5");
    expect(findNearestTabulatedPercentile(10.1)?.key).toBe("p15");
  });

  it("entradas inválidas → null", () => {
    expect(findNearestTabulatedPercentile(null)).toBeNull();
    expect(findNearestTabulatedPercentile(Number.NaN)).toBeNull();
    expect(findNearestTabulatedPercentile(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
