import { describe, expect, it } from "vitest";

import { buildPopPdfBytes } from "./pop-pdf";

describe("buildPopPdfBytes", () => {
  it("gera PDF não vazio", async () => {
    const bytes = await buildPopPdfBytes({
      popTitle: "Teste POP",
      body: "Linha 1\n\nLinha 2",
      meta: {
        establishmentLabel: "Cliente — Unidade",
        professionalName: "Nutri",
        professionalCrn: "1",
        versionNumber: 2,
        versionDateLabel: "06/04/2026",
      },
    });
    expect(bytes.length).toBeGreaterThan(400);
    expect(String.fromCharCode(bytes[0])).toBe("%");
  });
});
