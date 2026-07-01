import { describe, expect, it } from "vitest";

import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";

const template = (
  uf: string,
  applies: string[],
): Parameters<typeof filterTemplatesForEstablishment>[0][0] => ({
  id: "t1",
  name: "T",
  uf,
  applies_to: applies as never,
  sections: [],
});

describe("filterTemplatesForEstablishment", () => {
  it("devolve todos sem estabelecimento", () => {
    const list = [template("*", ["escola"])];
    expect(filterTemplatesForEstablishment(list, null)).toHaveLength(1);
  });

  it("filtra apenas por UF, não por tipo de estabelecimento", () => {
    const list = [
      template("SP", ["escola"]),
      template("RJ", ["escola"]),
      template("SP", ["hospital"]),
      template("*", ["empresa"]),
    ];
    const out = filterTemplatesForEstablishment(list, {
      state: "sp",
      establishment_type: "restaurante",
    });
    expect(out).toHaveLength(3);
    expect(out.every((t) => t.uf === "SP" || t.uf === "*")).toBe(true);
  });

  it("aceita UF wildcard", () => {
    const out = filterTemplatesForEstablishment([template("*", ["clinica"])], {
      state: "MG",
      establishment_type: "clinica",
    });
    expect(out).toHaveLength(1);
  });

  it("mostra templates de qualquer applies_to independente do tipo", () => {
    const list = [
      template("*", ["empresa"]),
      template("*", ["escola"]),
      template("*", ["lar_idosos"]),
    ];
    const out = filterTemplatesForEstablishment(list, {
      state: null,
      establishment_type: "restaurante",
    });
    expect(out).toHaveLength(3);
  });
});
