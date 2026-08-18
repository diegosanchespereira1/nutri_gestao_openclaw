import { describe, expect, it } from "vitest";

import {
  HEALTH_INDICATOR_SECTIONS,
  adultHistoryAnthroLabel,
  adultKpiReferenceNote,
  childKpiReferenceNote,
  deltaFromSeries,
  formatIndicatorValue,
  sliceLastN,
} from "@/lib/pacientes/health-indicator-series";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";

/** Linha infantil mínima para os testes de referência (menina, 61 meses). */
function childRow(overrides: Partial<ChildAssessmentRow> = {}): ChildAssessmentRow {
  return {
    id: "a1",
    patient_id: "p1",
    recorded_at: "2026-08-01T12:00:00.000Z",
    sex: "female",
    age_months: 61,
    weight_kg: 22,
    height_cm: 120,
    measured_lying: null,
    classification_method: "percentile",
    bmi: 15.3,
    results: [],
    clinical_notes: null,
    arm_circumference_cm: null,
    triceps_skinfold_mm: null,
    subscapular_skinfold_mm: null,
    head_circumference_cm: null,
    ...overrides,
  };
}

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

describe("childKpiReferenceNote", () => {
  it("IMC infantil → percentil + valor tabelado do percentil mais próximo", () => {
    // Menina, 61 meses, IMC 15,3 → entre P50 (15,2) e P75 (16,3), perto de P50.
    const note = childKpiReferenceNote([childRow()], "imc-infantil", "kg/m²");
    expect(note).toContain("P5"); // ≈ P5x
    expect(note).toContain("Ref. P50: 15,2 kg/m²");
  });

  it("usa a avaliação mais recente (última da lista ASC)", () => {
    const older = childRow({ recorded_at: "2026-01-01T12:00:00.000Z", weight_kg: 18 });
    const newer = childRow({ recorded_at: "2026-08-01T12:00:00.000Z" });
    const note = childKpiReferenceNote([older, newer], "imc-infantil", "kg/m²");
    expect(note).toContain("Ref. P50: 15,2 kg/m²");
  });

  it("indicador sem medida → null (não quebra)", () => {
    expect(
      childKpiReferenceNote([childRow({ weight_kg: null, bmi: null })], "peso", "kg"),
    ).toBeNull();
  });

  it("card sem mapeamento de percentil ou sem avaliações → null", () => {
    expect(childKpiReferenceNote([childRow()], "desconhecido", "kg")).toBeNull();
    expect(childKpiReferenceNote([], "peso", "kg")).toBeNull();
  });

  it("idade fora da tabela do indicador → null (não quebra)", () => {
    const note = childKpiReferenceNote(
      [childRow({ age_months: 130 })],
      "peso",
      "kg",
    );
    expect(note).toBeNull();
  });
});

describe("adultKpiReferenceNote", () => {
  /** Linha adulta mínima (homem, 30 anos) para os testes de referência. */
  function adultRow(
    overrides: Partial<AdultNutritionAssessmentRow> = {},
  ): AdultNutritionAssessmentRow {
    return {
      id: "b1",
      patient_id: "p1",
      recorded_at: "2026-08-01T12:00:00.000Z",
      patient_group: "homem_branco",
      has_amputation: false,
      amputation_segment_pct: null,
      age_years: 30,
      cb_cm: null,
      dct_mm: null,
      cp_cm: null,
      aj_cm: null,
      weight_real_kg: null,
      cmb_cm: null,
      estimated_weight_kg: null,
      estimated_height_m: null,
      bmi: null,
      kcal_per_kg: null,
      energy_needs_kcal: null,
      ptn_per_kg: null,
      protein_needs_g: null,
      nutritional_risk: null,
      nutritional_diagnosis: null,
      clinical_notes: null,
      ...overrides,
    };
  }

  it("IMC adulto → faixa OMS 18,5–24,9 (independe de avaliações)", () => {
    expect(adultKpiReferenceNote([], "imc", "adult")).toBe(
      "Ref. eutrofia OMS: 18,5–24,9 kg/m²",
    );
  });

  it("IMC idoso → faixa Lipschitz 22–27", () => {
    expect(adultKpiReferenceNote([], "imc", "geriatric")).toBe(
      "Ref. eutrofia Lipschitz: 22,0–27,0 kg/m²",
    );
  });

  it("CB adulto no P50 → percentil, referência Frisancho e classificação", () => {
    // Homem 30 anos, CB 32,5 = P50 exato da faixa 30.0–34.9.
    const note = adultKpiReferenceNote([adultRow({ cb_cm: 32.5 })], "cb", "adult");
    expect(note).toBe(
      "≈ P50 · Eutrofia\nRef. P50: 32,5 cm · Frisancho, 1999",
    );
  });

  it("DCT idoso usa tabela NHANES (60+)", () => {
    const note = adultKpiReferenceNote(
      [adultRow({ age_years: 65, dct_mm: 12.7 })],
      "dct",
      "geriatric",
    );
    expect(note).toBe(
      "≈ P50 · Eutrofia\nRef. P50: 12,7 mm · NHANES III",
    );
  });

  it("CB abaixo de P5 → boundary e desnutrição", () => {
    const note = adultKpiReferenceNote(
      [adultRow({ patient_group: "mulher_branca", age_years: 22, cb_cm: 20 })],
      "cb",
      "adult",
    );
    expect(note).toBe(
      "< P5 · Desnutrição\nRef. P5: 22,4 cm · Frisancho, 1999",
    );
  });

  it("idade fora da tabela adulta → mensagem de cobertura (não some)", () => {
    const note = adultKpiReferenceNote(
      [adultRow({ age_years: 70, cb_cm: 30 })],
      "cb",
      "adult",
    );
    expect(note).toContain("Fora da faixa de referência");
    expect(note).toContain("Frisancho, 1999");
  });

  it("sem idade ou sem medida → null (não quebra)", () => {
    expect(
      adultKpiReferenceNote([adultRow({ age_years: null, cb_cm: 30 })], "cb", "adult"),
    ).toBeNull();
    expect(adultKpiReferenceNote([adultRow()], "cb", "adult")).toBeNull();
    expect(adultKpiReferenceNote([], "cb", "adult")).toBeNull();
  });

  it("indicadores sem tabela (CP, AJ, PE...) → null", () => {
    const rows = [adultRow({ cb_cm: 32, dct_mm: 12, cmb_cm: 28 })];
    for (const id of ["cp", "aj", "pr", "pe", "ae", "kcal", "ptn", "ne", "np"]) {
      expect(adultKpiReferenceNote(rows, id, "adult")).toBeNull();
    }
  });

  it("histórico concatena medida e percentil curto", () => {
    expect(
      adultHistoryAnthroLabel("cb", "adult", adultRow({ cb_cm: 32.5 })),
    ).toBe("32,50 cm · ≈ P50");
  });
});
