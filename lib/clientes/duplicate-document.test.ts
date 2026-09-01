import { describe, expect, it } from "vitest";

import {
  buildDuplicateDocumentWarning,
  describeExistingClient,
} from "./duplicate-document";

const c = (legal_name: string, trade_name: string | null = null, id = "1") => ({
  id,
  legal_name,
  trade_name,
});

describe("describeExistingClient", () => {
  it("mostra razão social e nome fantasia quando são diferentes", () => {
    expect(describeExistingClient(c("Cinpal", "Cinpal Planta 2"))).toBe(
      "Cinpal (Cinpal Planta 2)",
    );
  });

  it("não repete quando o fantasia é igual à razão social", () => {
    expect(describeExistingClient(c("Cinpal", "Cinpal"))).toBe("Cinpal");
  });

  it("sem nome fantasia mostra só a razão social", () => {
    expect(describeExistingClient(c("Cinpal", null))).toBe("Cinpal");
    expect(describeExistingClient(c("Cinpal", "   "))).toBe("Cinpal");
  });
});

describe("buildDuplicateDocumentWarning", () => {
  it("sem cadastros existentes não há aviso", () => {
    expect(buildDuplicateDocumentWarning("49.656.192/0001-88", [])).toBeNull();
  });

  it("um cadastro: singular e diz que pode continuar", () => {
    const w = buildDuplicateDocumentWarning("49.656.192/0001-88", [
      c("CINPAL CIA", "Cinpal - Planta 1"),
    ])!;
    expect(w.kind).toBe("duplicate_document");
    expect(w.message).toContain("Já existe um cliente");
    expect(w.message).toContain("CINPAL CIA (Cinpal - Planta 1)");
    expect(w.message).toContain("pode continuar");
  });

  it("vários cadastros: plural com a contagem e a lista", () => {
    const w = buildDuplicateDocumentWarning("49.656.192/0001-88", [
      c("CINPAL CIA", "Cinpal - Planta 1", "a"),
      c("Cinpal", "Cinpal Planta 2", "b"),
    ])!;
    expect(w.message).toContain("Já existem 2 clientes");
    expect(w.message).toContain("Cinpal Planta 2");
  });

  it("preserva a lista para a UI montar os links", () => {
    const existentes = [c("A", null, "id-a"), c("B", null, "id-b")];
    const w = buildDuplicateDocumentWarning("00.000.000/0001-00", existentes)!;
    expect(w.existing.map((e) => e.id)).toEqual(["id-a", "id-b"]);
  });

  it("é um aviso, não um erro — nunca diz que está bloqueado", () => {
    const w = buildDuplicateDocumentWarning("1", [c("X")])!;
    expect(w.message.toLowerCase()).not.toContain("bloque");
    expect(w.message.toLowerCase()).not.toContain("não é possível");
  });
});
