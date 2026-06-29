import { describe, expect, it } from "vitest";

import {
  capitalizeChecklistText,
  normalizeChecklistText,
} from "@/lib/checklists/capitalize-checklist-text";

describe("capitalizeChecklistText", () => {
  it("capitaliza a primeira letra minúscula", () => {
    expect(capitalizeChecklistText("planilha de recebimento")).toBe(
      "Planilha de recebimento",
    );
    expect(capitalizeChecklistText("armazenamento seco adequado")).toBe(
      "Armazenamento seco adequado",
    );
  });

  it("preserva textos já capitalizados", () => {
    expect(capitalizeChecklistText("Planilha de recebimento")).toBe(
      "Planilha de recebimento",
    );
  });

  it("capitaliza após prefixo numérico ou colchetes", () => {
    expect(capitalizeChecklistText("[1] organizado e limpo")).toBe(
      "[1] Organizado e limpo",
    );
  });

  it("capitaliza letras acentuadas", () => {
    expect(capitalizeChecklistText("água potável disponível")).toBe(
      "Água potável disponível",
    );
  });

  it("retorna vazio inalterado", () => {
    expect(capitalizeChecklistText("")).toBe("");
  });
});

describe("normalizeChecklistText", () => {
  it("aplica trim e capitalização", () => {
    expect(normalizeChecklistText("  armazenamento refrigerado  ")).toBe(
      "Armazenamento refrigerado",
    );
  });

  it("retorna vazio após trim", () => {
    expect(normalizeChecklistText("   ")).toBe("");
  });
});
