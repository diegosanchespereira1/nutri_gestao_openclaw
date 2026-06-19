import { describe, expect, it } from "vitest";

import { buildTechnicalRecipePdfFilename } from "./technical-recipe-pdf-filename";

describe("buildTechnicalRecipePdfFilename", () => {
  it("usa nome da receita e data da última modificação", () => {
    const filename = buildTechnicalRecipePdfFilename({
      recipeName: "Bolo de Cenoura",
      updatedAtIso: "2026-06-18T15:30:00.000Z",
    });
    expect(filename).toBe("Bolo de Cenoura 18-06-2026.pdf");
  });

  it("remove caracteres inválidos do nome", () => {
    const filename = buildTechnicalRecipePdfFilename({
      recipeName: 'Salada "especial"/verão',
      updatedAtIso: "2026-01-02T12:00:00.000Z",
    });
    expect(filename).toBe("Salada especialverão 02-01-2026.pdf");
  });

  it("fallback quando nome vazio", () => {
    const filename = buildTechnicalRecipePdfFilename({
      recipeName: "   ",
      updatedAtIso: "2026-03-10T00:00:00.000Z",
    });
    expect(filename).toBe("Receita 09-03-2026.pdf");
  });
});
