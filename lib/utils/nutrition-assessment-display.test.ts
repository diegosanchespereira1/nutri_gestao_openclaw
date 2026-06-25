import { describe, expect, it } from "vitest";

import {
  buildAnthroAssessmentSummaryLine,
  buildAssessmentSummaryLine,
  buildChildAssessmentSummaryLine,
  formatAssessmentRecordedAt,
  toAssessmentNum,
} from "@/lib/utils/nutrition-assessment-display";

describe("toAssessmentNum", () => {
  it("converte string com vírgula", () => {
    expect(toAssessmentNum("70,5")).toBe(70.5);
  });

  it("devolve null para vazio", () => {
    expect(toAssessmentNum("")).toBeNull();
  });
});

describe("formatAssessmentRecordedAt", () => {
  it("formata ISO válido", () => {
    expect(formatAssessmentRecordedAt("2026-01-15T10:00:00Z")).toBeTruthy();
  });
});

describe("buildAssessmentSummaryLine", () => {
  it("monta resumo com medidas", () => {
    const line = buildAssessmentSummaryLine({
      height_cm: 170,
      weight_kg: 70,
      waist_cm: null,
      activity_level: "moderate",
      recorded_at: "",
      id: "1",
      patient_id: "p",
      user_id: "u",
      diet_notes: null,
      nutritional_diagnosis: null,
      clinical_notes: null,
      created_at: "",
      updated_at: "",
    });
    expect(line).toContain("170 cm");
    expect(line).toContain("70 kg");
    expect(line).toContain("IMC");
  });

  it("sem medidas", () => {
    expect(
      buildAssessmentSummaryLine({
        height_cm: null,
        weight_kg: null,
        waist_cm: null,
        activity_level: null,
        recorded_at: "",
        id: "1",
        patient_id: "p",
        user_id: "u",
        diet_notes: null,
        nutritional_diagnosis: null,
        clinical_notes: null,
        created_at: "",
        updated_at: "",
      }),
    ).toBe("Sem medidas numéricas");
  });
});

describe("buildAnthroAssessmentSummaryLine", () => {
  it("inclui risco nutricional", () => {
    const line = buildAnthroAssessmentSummaryLine({
      estimated_weight_kg: 60,
      bmi: 22,
      nutritional_risk: "s_rn",
    });
    expect(line).toContain("PE 60 kg");
    expect(line).toContain("S/RN");
  });
});

describe("buildChildAssessmentSummaryLine", () => {
  it("inclui classificação IMC", () => {
    const line = buildChildAssessmentSummaryLine({
      weight_kg: 20,
      height_cm: 110,
      bmi: 16.5,
      results: [
        {
          indicator: "bmi_for_age",
          classification: "Eutrofia",
          color: "green",
          method: "zscore",
          value: 0,
        },
      ],
    } as Parameters<typeof buildChildAssessmentSummaryLine>[0]);
    expect(line).toContain("Eutrofia");
  });
});
