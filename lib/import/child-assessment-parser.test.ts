import { describe, expect, it } from "vitest";

import { validateChildAssessmentRows } from "./child-assessment-parser";
import type { ParsedRow } from "@/lib/types/import";

function row(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    full_name: "Criança Teste",
    birth_date: "2006-01-10",
    recorded_at: "2026-01-09",
    sex: "F",
    weight_kg: "40",
    height_cm: "150",
    clinical_notes: "",
    ...overrides,
  };
}

describe("validateChildAssessmentRows — limite de idade (240 meses / 20 anos)", () => {
  it("aceita idade de exatos 240 meses", () => {
    const { valid, errors } = validateChildAssessmentRows([
      row({ birth_date: "2006-01-10", recorded_at: "2026-01-10" }),
    ]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
  });

  it("rejeita idade de 241 meses com mensagem específica", () => {
    const { valid, errors } = validateChildAssessmentRows([
      row({ birth_date: "2006-01-10", recorded_at: "2026-02-10" }),
    ]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/20 anos/);
  });

  it("linha normal (criança) continua válida", () => {
    const { valid, errors } = validateChildAssessmentRows([
      row({ birth_date: "2020-05-01", recorded_at: "2026-05-01" }),
    ]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
  });
});
