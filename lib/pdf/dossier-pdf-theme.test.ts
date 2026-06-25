import { describe, expect, it } from "vitest";

import { PdfColors, PdfSpace, PdfTheme, PdfType } from "@/lib/pdf/dossier-pdf-theme";

describe("dossier-pdf-theme", () => {
  it("PdfTheme agrega tokens", () => {
    expect(PdfTheme.colors).toBe(PdfColors);
    expect(PdfTheme.type).toBe(PdfType);
    expect(PdfTheme.space).toBe(PdfSpace);
  });

  it("cores brand definidas", () => {
    expect(PdfColors.navy).toBeDefined();
    expect(PdfColors.sky).toBeDefined();
    expect(PdfColors.green).toBeDefined();
  });

  it("escala tipográfica positiva", () => {
    expect(PdfType.body).toBeGreaterThan(0);
    expect(PdfType.scoreValue).toBeGreaterThan(PdfType.body);
  });

  it("espaçamentos estruturais", () => {
    expect(PdfSpace.marginX).toBeGreaterThan(0);
    expect(PdfSpace.headerBandH).toBeGreaterThan(PdfSpace.footerH);
  });
});
