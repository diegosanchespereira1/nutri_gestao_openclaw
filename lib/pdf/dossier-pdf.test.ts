import { describe, expect, it } from "vitest";

import {
  buildDossierPdfBytes,
  foldTextForPdf,
  normalizeCrnForPdf,
} from "./dossier-pdf";

describe("foldTextForPdf", () => {
  it("colapsa espaços e preserva acentos (fonte Unicode)", () => {
    expect(foldTextForPdf("Avaliação  Técnica")).toBe("Avaliação Técnica");
    expect(foldTextForPdf("  São  Paulo ")).toBe("São Paulo");
  });
});

describe("normalizeCrnForPdf", () => {
  it("remove prefixo CRN duplicado", () => {
    expect(normalizeCrnForPdf("CRN 344654")).toBe("344654");
    expect(normalizeCrnForPdf("crn 344654/P")).toBe("344654/P");
    expect(normalizeCrnForPdf("344654")).toBe("344654");
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

  it("omite seções vazias e gera PDF válido com score reduzido", async () => {
    const bytes = await buildDossierPdfBytes({
      templateName: "CINPAL produção",
      establishmentLabel: "CINPAL CIA — Cinpal - Planta 1",
      clientLabel: "Cinpal - Planta 1",
      approvedAtLabel: "16 de agosto de 2026, 18:26",
      professionalName: "Nutricionista",
      crn: "12345",
      score: { percentage: 18, pointsEarned: 4, pointsTotal: 22 },
      sections: [
        { title: "Documentação", items: [] },
        {
          title: "Manipulação e Boas Práticas",
          items: [
            {
              description: "Item 1",
              outcome: "conforme",
              note: null,
              annotation: null,
            },
            {
              description: "Item 2",
              outcome: "nc",
              note: null,
              annotation: null,
            },
          ],
        },
        {
          title: "Asseio pessoal",
          items: [
            {
              description: "Item 3",
              outcome: "na",
              note: null,
              annotation: null,
            },
          ],
        },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(2000);
    expect(Buffer.from(bytes.slice(0, 5)).toString("utf8")).toBe("%PDF-");
  });
});
