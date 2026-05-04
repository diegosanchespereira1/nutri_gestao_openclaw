import { describe, expect, it } from "vitest";

import { formatApprovedAtForDossierPdf } from "./build-approved-dossier-pdf";

describe("formatApprovedAtForDossierPdf", () => {
  it("formata data no fuso America/Sao_Paulo (GMT-3)", () => {
    const label = formatApprovedAtForDossierPdf("2026-05-04T12:00:00.000Z");

    expect(label).toContain("2026");
    expect(label).toMatch(/\b(09|9):00\b/);
  });
});
