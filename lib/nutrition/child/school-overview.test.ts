import { describe, expect, it } from "vitest";

import type { ChildResultEntry } from "@/lib/types/child-assessments";

import {
  SCHOOL_OVERVIEW_ALL,
  SCHOOL_OVERVIEW_UNGRADED,
  SCHOOL_OVERVIEW_UNGRADED_LABEL,
  buildSchoolNutritionOverview,
  formatAverageAgeMonths,
  normalizeChildResults,
  parseCivilDate,
  parseSchoolOverviewSerieParam,
} from "./school-overview";

const NOW = new Date(2026, 8, 7); // 7 set 2026

function result(
  indicator: ChildResultEntry["indicator"],
  classification: string,
  color: ChildResultEntry["color"] = "green",
): ChildResultEntry {
  return {
    indicator,
    value: 15,
    percentile: 50,
    z: null,
    boundary: null,
    classification,
    color,
    adequateLow: 12,
    adequateHigh: 18,
    outOfRange: false,
  };
}

describe("parseSchoolOverviewSerieParam", () => {
  it("trata vazio e all como escola inteira", () => {
    expect(parseSchoolOverviewSerieParam(undefined)).toBe(SCHOOL_OVERVIEW_ALL);
    expect(parseSchoolOverviewSerieParam("")).toBe(SCHOOL_OVERVIEW_ALL);
    expect(parseSchoolOverviewSerieParam("all")).toBe(SCHOOL_OVERVIEW_ALL);
  });

  it("preserva série e sem-série", () => {
    expect(parseSchoolOverviewSerieParam("sem-serie")).toBe(SCHOOL_OVERVIEW_UNGRADED);
    expect(parseSchoolOverviewSerieParam("grade-1")).toBe("grade-1");
  });
});

describe("formatAverageAgeMonths / parseCivilDate", () => {
  it("formata anos e meses", () => {
    expect(formatAverageAgeMonths(51)).toBe("4 anos e 3 meses");
    expect(formatAverageAgeMonths(12)).toBe("1 ano");
    expect(formatAverageAgeMonths(1)).toBe("1 mês");
    expect(formatAverageAgeMonths(null)).toBe("—");
  });

  it("lê YYYY-MM-DD como data civil", () => {
    const d = parseCivilDate("2022-03-15");
    expect(d?.getFullYear()).toBe(2022);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });
});

describe("normalizeChildResults", () => {
  it("aceita array e objeto", () => {
    const row = result("bmi_for_age", "Obesidade", "red");
    expect(normalizeChildResults([row])).toEqual([row]);
    expect(normalizeChildResults({ bmi_for_age: row })).toEqual([row]);
    expect(normalizeChildResults(null)).toEqual([]);
  });
});

describe("buildSchoolNutritionOverview", () => {
  const grades = [
    { id: "g1", name: "Maternal II", position: 1 },
    { id: "g2", name: "3º ano B", position: 2 },
  ];

  const patients = [
    { id: "p1", schoolGradeId: "g1", birthDate: "2022-06-07" }, // 4a 3m
    { id: "p2", schoolGradeId: "g1", birthDate: "2022-06-07" },
    { id: "p3", schoolGradeId: "g2", birthDate: "2018-09-07" }, // 8a
    { id: "p4", schoolGradeId: null, birthDate: null },
  ];

  const latest = new Map<string, ChildResultEntry[]>([
    [
      "p1",
      [
        result("bmi_for_age", "IMC adequado ou eutrófico", "green"),
        result("weight_for_age", "Peso adequado ou eutrófico", "green"),
        result("height_for_age", "Estatura adequada para a idade", "green"),
      ],
    ],
    [
      "p2",
      [
        result("bmi_for_age", "Obesidade", "red"),
        result("weight_for_age", "Peso elevado para a idade", "yellow"),
        result("height_for_age", "Estatura adequada para a idade", "green"),
        result("arm_circumference_for_age", "CB adequada para a idade", "green"),
      ],
    ],
    [
      "p3",
      [
        result("bmi_for_age", "Sobrepeso", "yellow"),
        {
          ...result("weight_for_age", "Peso adequado ou eutrófico"),
          outOfRange: true,
          classification: null,
        },
        result("height_for_age", "Baixa estatura para a idade", "yellow"),
      ],
    ],
  ]);

  it("inclui todos, conta sem avaliação e usa só a avaliação mais recente já mapeada", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_ALL,
      now: NOW,
    });

    expect(overview.coverage.total).toBe(4);
    expect(overview.coverage.assessed).toBe(3);
    expect(overview.coverage.withoutAssessment).toBe(1);
    expect(overview.coverage.withoutBirthDate).toBe(1);
    expect(overview.coverage.coveragePercent).toBe(75);
  });

  it("conta faixas oficiais do IMC e não mistura sem avaliação no gráfico", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_ALL,
      now: NOW,
    });

    const imc = overview.indicators.find((b) => b.indicator === "bmi_for_age");
    expect(imc).toBeTruthy();
    const byLabel = Object.fromEntries(imc!.bands.map((b) => [b.label, b.count]));
    expect(byLabel["IMC adequado ou eutrófico"]).toBe(1);
    expect(byLabel.Sobrepeso).toBe(1);
    expect(byLabel.Obesidade).toBe(1);
    expect(byLabel["Baixo IMC para idade"]).toBe(0);
    const bandTotal = imc!.bands.reduce((sum, b) => sum + b.count, 0);
    expect(bandTotal).toBe(3);
  });

  it("marca indicador ausente/outOfRange como Sem este indicador", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_ALL,
      now: NOW,
    });
    const weight = overview.indicators.find((b) => b.indicator === "weight_for_age");
    const missing = weight?.bands.find((b) => b.label === "Sem este indicador");
    expect(missing?.count).toBe(1);
  });

  it("mostra indicador extra só quando alguém tem resultado", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_ALL,
      now: NOW,
    });
    expect(
      overview.indicators.some((b) => b.indicator === "arm_circumference_for_age"),
    ).toBe(true);
    expect(
      overview.indicators.some((b) => b.indicator === "head_circumference_for_age"),
    ).toBe(false);
  });

  it("filtra por série e esconde a tabela-resumo", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: "g1",
      now: NOW,
    });
    expect(overview.coverage.total).toBe(2);
    expect(overview.coverage.assessed).toBe(2);
    expect(overview.coverage.withoutAssessment).toBe(0);
    expect(overview.scopeLabel).toBe("Maternal II");
    expect(overview.gradeRows).toEqual([]);
  });

  it("tabela por série fecha com o total da escola e inclui sem série", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_ALL,
      now: NOW,
    });
    expect(overview.gradeRows.map((r) => r.name)).toEqual([
      "Maternal II",
      "3º ano B",
      SCHOOL_OVERVIEW_UNGRADED_LABEL,
    ]);
    const sumTotal = overview.gradeRows.reduce((s, r) => s + r.total, 0);
    const sumAssessed = overview.gradeRows.reduce((s, r) => s + r.assessed, 0);
    expect(sumTotal).toBe(overview.coverage.total);
    expect(sumAssessed).toBe(overview.coverage.assessed);
  });

  it("média de idade ignora quem não tem nascimento", () => {
    const overview = buildSchoolNutritionOverview({
      patients,
      latestResultsByPatientId: latest,
      grades,
      filter: SCHOOL_OVERVIEW_UNGRADED,
      now: NOW,
    });
    expect(overview.coverage.total).toBe(1);
    expect(overview.coverage.averageAgeLabel).toBe("—");
    expect(overview.coverage.withoutBirthDate).toBe(1);
  });
});
