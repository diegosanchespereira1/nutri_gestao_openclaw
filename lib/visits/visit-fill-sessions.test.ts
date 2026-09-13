import { describe, expect, it } from "vitest";

/** Espelha a escolha usada em loadFillSessionsForVisit (lista já ordenada por updated_at desc). */
function pickLatestApprovedSessionId(
  rows: Array<{ id: string; status: "em_andamento" | "aprovado" }>,
): string | null {
  return rows.find((r) => r.status === "aprovado")?.id ?? null;
}

describe("pickLatestApprovedSessionId (visita)", () => {
  it("escolhe a primeira aprovada na ordem da lista", () => {
    expect(
      pickLatestApprovedSessionId([
        { id: "draft", status: "em_andamento" },
        { id: "approved-new", status: "aprovado" },
        { id: "approved-old", status: "aprovado" },
      ]),
    ).toBe("approved-new");
  });

  it("devolve null quando não há dossiê aprovado", () => {
    expect(
      pickLatestApprovedSessionId([{ id: "draft", status: "em_andamento" }]),
    ).toBeNull();
    expect(pickLatestApprovedSessionId([])).toBeNull();
  });
});
