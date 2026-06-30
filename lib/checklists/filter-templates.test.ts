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

  it("filtra por UF e tipo", () => {
    const list = [
      template("SP", ["escola"]),
      template("RJ", ["escola"]),
      template("SP", ["hospital"]),
    ];
    const out = filterTemplatesForEstablishment(list, {
      state: "sp",
      establishment_type: "escola",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.uf).toBe("SP");
  });

  it("aceita UF wildcard", () => {
    const out = filterTemplatesForEstablishment([template("*", ["clinica"])], {
      state: "MG",
      establishment_type: "clinica",
    });
    expect(out).toHaveLength(1);
  });

  it("inclui templates de empresa para estabelecimento restaurante", () => {
    const list = [
      template("*", ["empresa"]),
      template("*", ["escola"]),
      template("SP", ["empresa"]),
    ];
    const out = filterTemplatesForEstablishment(list, {
      state: null,
      establishment_type: "restaurante",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.uf).toBe("*");
  });

  it("não aplica templates de empresa a tipos de atendimento nutricional", () => {
    const out = filterTemplatesForEstablishment([template("*", ["empresa"])], {
      state: "SP",
      establishment_type: "escola",
    });
    expect(out).toHaveLength(0);
  });
});
