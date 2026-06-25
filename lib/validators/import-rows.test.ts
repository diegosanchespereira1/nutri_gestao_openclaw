import { describe, expect, it } from "vitest";

import {
  parseImportClientsPayload,
  parseImportEstablishmentsPayload,
  parseImportPatientsPayload,
} from "@/lib/validators/import-rows";

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("parseImportClientsPayload", () => {
  it("aceita linha válida", () => {
    const r = parseImportClientsPayload([
      { legal_name: "Cliente A", kind: "pf" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]?.legal_name).toBe("Cliente A");
  });

  it("rejeita payload inválido", () => {
    expect(parseImportClientsPayload([{ kind: "pf" }]).ok).toBe(false);
  });
});

describe("parseImportEstablishmentsPayload", () => {
  it("aceita estabelecimento válido", () => {
    const r = parseImportEstablishmentsPayload(
      [{ name: "Escola", establishment_type: "escola" }],
      CLIENT_ID,
    );
    expect(r.ok).toBe(true);
  });

  it("rejeita clientId inválido", () => {
    expect(
      parseImportEstablishmentsPayload(
        [{ name: "Escola", establishment_type: "escola" }],
        "not-uuid",
      ).ok,
    ).toBe(false);
  });
});

describe("parseImportPatientsPayload", () => {
  it("aceita paciente válido", () => {
    const r = parseImportPatientsPayload(
      [{ full_name: "Maria" }],
      CLIENT_ID,
    );
    expect(r.ok).toBe(true);
  });
});
