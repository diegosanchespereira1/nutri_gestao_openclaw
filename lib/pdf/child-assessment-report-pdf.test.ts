import { describe, expect, it } from "vitest";

import {
  buildChildAssessmentReportPdfBytes,
  type ChildReportInput,
} from "./child-assessment-report-pdf";

const sample: ChildReportInput = {
  tenantName: "Clínica Bem Nutrir",
  tenantInitials: "BN",
  logoBuffer: null,
  signatureBuffer: null,
  emittedAtLabel: "13/06/2026",
  patient: {
    name: "Laura Martins Costa",
    birthLabel: "12/03/2018",
    ageLabel: "7a 3m",
    sexLabel: "Feminino",
  },
  summary: [
    {
      label: "IMC para idade",
      status: "IMC adequado ou eutrófico",
      color: "green",
      valueLabel: "IMC 15,3 kg/m² · percentil 52",
      rangeLabel: "Faixa adequada: 13,1–17,5 kg/m²",
      percent: 52,
    },
    {
      label: "Peso para idade",
      status: "Peso adequado ou eutrófico",
      color: "green",
      valueLabel: "22,0 kg · percentil 55",
      rangeLabel: "Faixa adequada: 17,5–28,4 kg",
      percent: 55,
    },
    {
      label: "Estatura para idade",
      status: "Estatura adequada para a idade",
      color: "green",
      valueLabel: "120 cm · percentil 40",
      rangeLabel: "Esperado: a partir de 111 cm",
      percent: 40,
    },
  ],
  history: [
    {
      dateLabel: "13/06/2026",
      ageLabel: "7a 3m",
      weightLabel: "22,0 kg",
      heightLabel: "120 cm",
      bmiLabel: "15,3",
      bmiPercentileLabel: "P52",
      bmiClassification: "IMC adequado ou eutrófico",
      color: "green",
      current: true,
    },
    {
      dateLabel: "12/03/2026",
      ageLabel: "7a 0m",
      weightLabel: "21,2 kg",
      heightLabel: "118 cm",
      bmiLabel: "15,2",
      bmiPercentileLabel: "P50",
      bmiClassification: "IMC adequado ou eutrófico",
      color: "green",
      current: false,
    },
  ],
  professionalName: "Dra. Ana Saber",
  crn: "3 12345",
  clinicalNotes: "Manter alimentação variada e atividade física regular. Reavaliar em 6 meses.",
};

describe("buildChildAssessmentReportPdfBytes", () => {
  it("gera um PDF válido sem erro de codificação de fonte", async () => {
    const bytes = await buildChildAssessmentReportPdfBytes(sample);
    expect(bytes.length).toBeGreaterThan(1000);
    const head = new TextDecoder().decode(bytes.slice(0, 5));
    expect(head).toBe("%PDF-");
  });

  it("lida com obesidade (vermelho) e sem notas", async () => {
    const bytes = await buildChildAssessmentReportPdfBytes({
      ...sample,
      clinicalNotes: null,
      summary: [
        { ...sample.summary[0], status: "Obesidade", color: "red", percent: 98 },
        ...sample.summary.slice(1),
      ],
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });
});
