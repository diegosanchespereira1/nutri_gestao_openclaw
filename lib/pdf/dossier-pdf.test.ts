import { describe, expect, it } from "vitest";

import { buildDossierPdfBytes, foldTextForPdf } from "./dossier-pdf";

describe("foldTextForPdf", () => {
  it("colapsa espaços e preserva acentos (fonte Unicode)", () => {
    expect(foldTextForPdf("Avaliação  Técnica")).toBe("Avaliação Técnica");
    expect(foldTextForPdf("  São  Paulo ")).toBe("São Paulo");
  });
});

describe("buildDossierPdfBytes", () => {
  it("gera um PDF válido com seções, score e sem logo", async () => {
    const bytes = await buildDossierPdfBytes({
      templateName: "Checklist de BPF — Restaurantes",
      establishmentLabel: "Cozinha Principal — Cliente Demo Ltda.",
      clientLabel: "Cliente Demo Ltda.",
      approvedAtLabel: "24 de abril de 2026, 10:45",
      professionalName: "Ana Souza",
      crn: "12345/P",
      areaName: "Cozinha Quente",
      logoBuffer: null,
      score: { percentage: 87, pointsEarned: 26, pointsTotal: 30 },
      sections: [
        {
          title: "Higiene de instalações",
          items: [
            {
              description: "Pisos íntegros, sem rachaduras.",
              outcome: "conforme",
              note: null,
              annotation: "Verificado em inspeção visual.",
            },
            {
              description: "Controle de pragas documentado.",
              outcome: "nc",
              note: "Relatório vencido há 2 meses.",
              annotation: null,
            },
            {
              description: "Ralos com proteção anti-insetos.",
              outcome: "na",
              note: null,
              annotation: null,
            },
          ],
        },
        {
          title: "Manipuladores",
          items: [
            {
              description: "Uniformes completos.",
              outcome: "conforme",
              note: null,
              annotation: null,
            },
          ],
        },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(2000);
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf8");
    expect(header).toBe("%PDF-");
  });

  it("ignora score quando ausente e funciona sem área", async () => {
    const bytes = await buildDossierPdfBytes({
      templateName: "Modelo sem score",
      establishmentLabel: "Unidade Única",
      approvedAtLabel: "01/01/2026",
      professionalName: "João",
      crn: "",
      sections: [
        {
          title: "Unica",
          items: [
            {
              description: "Item sem avaliação",
              outcome: null,
              note: null,
              annotation: null,
            },
          ],
        },
      ],
    });
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
