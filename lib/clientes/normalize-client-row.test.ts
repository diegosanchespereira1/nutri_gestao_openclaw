import { describe, expect, it } from "vitest";

import {
  normalizeClientEditShell,
  normalizeClientRow,
} from "@/lib/clientes/normalize-client-row";

describe("normalizeClientEditShell", () => {
  it("normaliza shell mínimo", () => {
    const row = normalizeClientEditShell({
      id: "c1",
      kind: "pj",
      legal_name: "Empresa",
      lifecycle_status: "inativo",
      logo_storage_path: null,
    });
    expect(row.kind).toBe("pj");
    expect(row.lifecycle_status).toBe("inativo");
  });

  it("default kind pf", () => {
    expect(normalizeClientEditShell({ id: "x" }).kind).toBe("pf");
  });
});

describe("normalizeClientRow", () => {
  it("normaliza lifecycle e segment", () => {
    const row = normalizeClientRow({
      id: "c1",
      kind: "pf",
      legal_name: "João",
      lifecycle_status: "finalizado",
      business_segment: "escola",
      social_links: { instagram: "@x" },
      responsible_team_member_id: "tm-1",
    });
    expect(row.lifecycle_status).toBe("finalizado");
    expect(row.business_segment).toBe("escola");
    expect(row.social_links).toEqual({ instagram: "@x" });
    expect(row.responsible_team_member_id).toBe("tm-1");
  });

  it("segment inválido vira null", () => {
    expect(
      normalizeClientRow({
        id: "c1",
        legal_name: "X",
        business_segment: "invalido",
      }).business_segment,
    ).toBeNull();
  });
});
