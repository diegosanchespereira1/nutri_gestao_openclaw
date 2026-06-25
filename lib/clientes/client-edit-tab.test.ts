import { describe, expect, it } from "vitest";

import {
  clientEditTabHref,
  resolveClientEditTab,
} from "@/lib/clientes/client-edit-tab";

describe("resolveClientEditTab", () => {
  it("default dados", () => {
    expect(resolveClientEditTab(undefined, "pf")).toBe("dados");
  });

  it("PF não tem checklists", () => {
    expect(resolveClientEditTab("checklists", "pf")).toBe("dados");
  });

  it("PJ aceita checklists", () => {
    expect(resolveClientEditTab("checklists", "pj")).toBe("checklists");
  });

  it("alias contratos → financeiro", () => {
    expect(resolveClientEditTab("contratos", "pf")).toBe("financeiro");
  });
});

describe("clientEditTabHref", () => {
  it("href base sem tab", () => {
    expect(clientEditTabHref("id-1", "dados")).toBe("/clientes/id-1/editar");
  });

  it("inclui tab e filtros checklists", () => {
    const href = clientEditTabHref("id-1", "checklists", {
      checklist: { est: "e1", status: "open", page: "2" },
    });
    expect(href).toContain("tab=checklists");
    expect(href).toContain("est=e1");
  });
});
