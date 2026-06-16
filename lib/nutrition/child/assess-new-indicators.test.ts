/**
 * Testes do orquestrador e classificação para os novos indicadores
 * (CB, PCT, SE, PC) — cenários de faixa coberta, fora de faixa e campos null.
 */
import { describe, expect, it } from "vitest";
import { assessChild } from "./assess";
import { classifyByPercentile } from "./classify";
import { getReference } from "./reference";

// ---------------------------------------------------------------------------
// Helper: input base com todos os novos campos
// ---------------------------------------------------------------------------
const baseInput3mFemale = {
  sex: "female" as const,
  ageMonths: 3,
  weightKg: 5.8,
  heightCm: 60.0,
  method: "percentile" as const,
  armCircumferenceCm:    13.0,
  tricepsSkinfoldMm:      9.8,   // ≈ p50 do mês 3
  subscapularSkinfoldMm:  7.8,   // ≈ p50 do mês 3
  headCircumferenceCm:   39.5,   // ≈ p50 do mês 3
};

// ---------------------------------------------------------------------------
// 1. Orquestrador completo — faixa coberta
// ---------------------------------------------------------------------------
describe("assessChild — 4 novos indicadores presentes (3 meses, female)", () => {
  it("inclui arm_circumference_for_age no resultado", () => {
    const r = assessChild(baseInput3mFemale);
    expect(r.indicators.map((i) => i.indicator)).toContain("arm_circumference_for_age");
  });

  it("inclui triceps_skinfold_for_age no resultado", () => {
    const r = assessChild(baseInput3mFemale);
    expect(r.indicators.map((i) => i.indicator)).toContain("triceps_skinfold_for_age");
  });

  it("inclui subscapular_skinfold_for_age no resultado", () => {
    const r = assessChild(baseInput3mFemale);
    expect(r.indicators.map((i) => i.indicator)).toContain("subscapular_skinfold_for_age");
  });

  it("inclui head_circumference_for_age no resultado", () => {
    const r = assessChild(baseInput3mFemale);
    expect(r.indicators.map((i) => i.indicator)).toContain("head_circumference_for_age");
  });

  it("CB de 13,0 cm (≈p50) não fica outOfRange no mês 3", () => {
    const r = assessChild(baseInput3mFemale);
    const cb = r.indicators.find((i) => i.indicator === "arm_circumference_for_age");
    expect(cb?.outOfRange).toBe(false);
  });

  it("CB de 13,0 cm (≈p50) recebe classificação verde (adequada)", () => {
    const r = assessChild(baseInput3mFemale);
    const cb = r.indicators.find((i) => i.indicator === "arm_circumference_for_age");
    expect(cb?.color).toBe("green");
    expect(cb?.classification).toBe("CB adequada para a idade");
  });

  it("PC de 39,5 cm (≈p50) é classificado no mês 3", () => {
    const r = assessChild(baseInput3mFemale);
    const pc = r.indicators.find((i) => i.indicator === "head_circumference_for_age");
    expect(pc?.outOfRange).toBe(false);
    expect(pc?.classification).toBe("PC adequado para a idade");
  });
});

// ---------------------------------------------------------------------------
// 2. Fora de faixa — mês 2 (CB/PCT/SE não cobertos; PC cobre desde 0)
// ---------------------------------------------------------------------------
describe("assessChild — mês 2 (antes da faixa de CB/PCT/SE)", () => {
  const input2m = {
    ...baseInput3mFemale,
    ageMonths: 2,
    headCircumferenceCm: 38.3,
  };

  it("CB/PCT/SE ficam outOfRange com ageMonths=2", () => {
    const r = assessChild(input2m);
    for (const ind of ["arm_circumference_for_age", "triceps_skinfold_for_age", "subscapular_skinfold_for_age"] as const) {
      const item = r.indicators.find((i) => i.indicator === ind);
      expect(item?.outOfRange, ind).toBe(true);
    }
  });

  it("PC cobre mês 2 (tabela começa em 0) — não fica outOfRange", () => {
    const r = assessChild(input2m);
    const pc = r.indicators.find((i) => i.indicator === "head_circumference_for_age");
    expect(pc?.outOfRange).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Fora de faixa — mês 61 (todos os novos indicadores fora)
// ---------------------------------------------------------------------------
describe("assessChild — mês 61 (após a faixa de todos os novos indicadores)", () => {
  const input61m = {
    sex: "male" as const,
    ageMonths: 61,
    weightKg: 20.0,
    heightCm: 108.0,
    method: "percentile" as const,
    armCircumferenceCm:    16.0,
    tricepsSkinfoldMm:      8.5,
    subscapularSkinfoldMm:  6.1,
    headCircumferenceCm:   49.0,
  };

  it("todos os 4 novos indicadores ficam outOfRange com ageMonths=61", () => {
    const r = assessChild(input61m);
    for (const ind of ["arm_circumference_for_age", "triceps_skinfold_for_age", "subscapular_skinfold_for_age", "head_circumference_for_age"] as const) {
      const item = r.indicators.find((i) => i.indicator === ind);
      expect(item?.outOfRange, ind).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Campos null — não informados pelo profissional
// ---------------------------------------------------------------------------
describe("assessChild — novos campos null (não informados)", () => {
  const inputNull = {
    sex: "female" as const,
    ageMonths: 12,
    weightKg: 9.0,
    heightCm: 74.0,
    method: "percentile" as const,
    armCircumferenceCm:    null,
    tricepsSkinfoldMm:     null,
    subscapularSkinfoldMm: null,
    headCircumferenceCm:   null,
  };

  it("campos null → indicadores sem classificação mas sem outOfRange", () => {
    const r = assessChild(inputNull);
    for (const ind of ["arm_circumference_for_age", "triceps_skinfold_for_age", "subscapular_skinfold_for_age", "head_circumference_for_age"] as const) {
      const item = r.indicators.find((i) => i.indicator === ind);
      expect(item?.classification, ind).toBeNull();
      expect(item?.outOfRange, ind).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. classifyByPercentile — regras por indicador
// ---------------------------------------------------------------------------

// CB meninas mês 3: p3=11.2, p97=15.3 (dados da tabela WHO)
const cbRow3Female = getReference("arm_circumference_for_age", "female", 3, "percentile")!;

describe("classifyByPercentile — arm_circumference_for_age", () => {
  it("abaixo de P3 → CB baixa para a idade (yellow)", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 3, 10.0, cbRow3Female);
    expect(r.classification).toBe("CB baixa para a idade");
    expect(r.color).toBe("yellow");
  });

  it("entre P3 e P97 → CB adequada para a idade (green)", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 3, 13.0, cbRow3Female);
    expect(r.classification).toBe("CB adequada para a idade");
    expect(r.color).toBe("green");
  });

  it("em P97 ou acima → CB elevada para a idade (yellow)", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 3, 16.0, cbRow3Female);
    expect(r.classification).toBe("CB elevada para a idade");
    expect(r.color).toBe("yellow");
  });
});

// PC meninas mês 3: p3=37.2, p97=41.9 (dados da tabela WHO)
const pcRow3Female = getReference("head_circumference_for_age", "female", 3, "percentile")!;

describe("classifyByPercentile — head_circumference_for_age", () => {
  it("abaixo de P3 → Microcefalia (red)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 36.0, pcRow3Female);
    expect(r.classification).toBe("Microcefalia");
    expect(r.color).toBe("red");
  });

  it("entre P3 e P97 → PC adequado para a idade (green)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 39.5, pcRow3Female);
    expect(r.classification).toBe("PC adequado para a idade");
    expect(r.color).toBe("green");
  });

  it("em P97 ou acima → Macrocefalia (yellow)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 43.0, pcRow3Female);
    expect(r.classification).toBe("Macrocefalia");
    expect(r.color).toBe("yellow");
  });
});

// PCT meninas mês 3: p3=6.9 (dados da tabela WHO)
const pctRow3Female = getReference("triceps_skinfold_for_age", "female", 3, "percentile")!;

describe("classifyByPercentile — triceps_skinfold_for_age", () => {
  it("abaixo de P3 → PCT baixa para a idade (yellow)", () => {
    const r = classifyByPercentile("triceps_skinfold_for_age", 3, 6.0, pctRow3Female);
    expect(r.classification).toBe("PCT baixa para a idade");
    expect(r.color).toBe("yellow");
  });

  it("entre P3 e P97 → PCT adequada para a idade (green)", () => {
    const r = classifyByPercentile("triceps_skinfold_for_age", 3, 9.8, pctRow3Female);
    expect(r.classification).toBe("PCT adequada para a idade");
    expect(r.color).toBe("green");
  });
});

// SE meninas mês 3: p3=5.6 (dados da tabela WHO)
const seRow3Female = getReference("subscapular_skinfold_for_age", "female", 3, "percentile")!;

describe("classifyByPercentile — subscapular_skinfold_for_age", () => {
  it("abaixo de P3 → SE baixa para a idade (yellow)", () => {
    const r = classifyByPercentile("subscapular_skinfold_for_age", 3, 5.0, seRow3Female);
    expect(r.classification).toBe("SE baixa para a idade");
    expect(r.color).toBe("yellow");
  });

  it("entre P3 e P97 → SE adequada para a idade (green)", () => {
    const r = classifyByPercentile("subscapular_skinfold_for_age", 3, 7.8, seRow3Female);
    expect(r.classification).toBe("SE adequada para a idade");
    expect(r.color).toBe("green");
  });

  it("em P97 ou acima → SE elevada para a idade (yellow)", () => {
    const r = classifyByPercentile("subscapular_skinfold_for_age", 3, 15.0, seRow3Female);
    expect(r.classification).toBe("SE elevada para a idade");
    expect(r.color).toBe("yellow");
  });
});
