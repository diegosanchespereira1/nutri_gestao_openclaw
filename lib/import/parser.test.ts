import { describe, expect, it } from "vitest";

import {
  applyMappings,
  validateClientRows,
  validateEstablishmentRows,
  validatePatientRows,
  validateRows,
} from "@/lib/import/parser";

describe("applyMappings", () => {
  it("mapeia colunas para campos", () => {
    const rows = applyMappings(
      [["João", "pf"]],
      ["nome", "tipo"],
      [
        { fileColumn: "nome", systemField: "legal_name" },
        { fileColumn: "tipo", systemField: "kind" },
      ],
    );
    expect(rows[0]?.legal_name).toBe("João");
    expect(rows[0]?.kind).toBe("pf");
  });
});

describe("validateClientRows", () => {
  it("aceita cliente válido", () => {
    const r = validateClientRows([{ legal_name: "A", kind: "pf" }]);
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
  });

  it("rejeita sem nome", () => {
    const r = validateClientRows([{ legal_name: "", kind: "pf" }]);
    expect(r.errors[0]?.message).toContain("obrigatório");
  });

  it("rejeita kind inválido", () => {
    const r = validateClientRows([{ legal_name: "A", kind: "xx" }]);
    expect(r.errors).toHaveLength(1);
  });
});

describe("validateEstablishmentRows", () => {
  it("aceita estabelecimento", () => {
    const r = validateEstablishmentRows([
      { name: "Escola", establishment_type: "escola" },
    ]);
    expect(r.valid).toHaveLength(1);
  });
});

describe("validatePatientRows", () => {
  it("aceita paciente", () => {
    const r = validatePatientRows([{ full_name: "Maria" }]);
    expect(r.valid).toHaveLength(1);
  });

  it("rejeita data inválida", () => {
    const r = validatePatientRows([
      { full_name: "Maria", birth_date: "20/06/2020" },
    ]);
    expect(r.errors).toHaveLength(1);
  });
});

describe("validateRows", () => {
  it("delega por entidade", () => {
    expect(validateRows("pacientes", [{ full_name: "X" }]).valid).toHaveLength(
      1,
    );
  });
});
