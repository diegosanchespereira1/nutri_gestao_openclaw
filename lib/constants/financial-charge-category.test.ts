import { describe, expect, it } from "vitest";

import {
  chargeCategoryDisplayLabel,
  isAllowedChargeCategory,
  isReservedChargeCategoryLabel,
} from "./financial-charge-category";

describe("chargeCategoryDisplayLabel", () => {
  it("traduz slugs padrão", () => {
    expect(chargeCategoryDisplayLabel("mensalidade")).toBe("Mensalidade");
    expect(chargeCategoryDisplayLabel("avaliacao_nutricional")).toBe(
      "Avaliação Nutricional",
    );
  });

  it("mantém label personalizada e vazio", () => {
    expect(chargeCategoryDisplayLabel("Treinamento")).toBe("Treinamento");
    expect(chargeCategoryDisplayLabel(null)).toBe("—");
  });
});

describe("isReservedChargeCategoryLabel", () => {
  it("bloqueia nomes iguais aos padrão", () => {
    expect(isReservedChargeCategoryLabel("Mensalidade")).toBe(true);
    expect(isReservedChargeCategoryLabel("avaliacao nutricional")).toBe(true);
    expect(isReservedChargeCategoryLabel("consultoria")).toBe(true);
  });

  it("aceita nomes novos", () => {
    expect(isReservedChargeCategoryLabel("Treinamento in loco")).toBe(false);
  });
});

describe("isAllowedChargeCategory", () => {
  it("aceita builtin ou personalizada do workspace", () => {
    expect(isAllowedChargeCategory("mensalidade", [])).toBe(true);
    expect(isAllowedChargeCategory("Treinamento", ["Treinamento"])).toBe(true);
    expect(isAllowedChargeCategory("Outro", ["Treinamento"])).toBe(false);
  });
});
