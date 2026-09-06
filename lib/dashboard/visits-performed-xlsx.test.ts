import { describe, expect, it } from "vitest";

import {
  buildVisitsPerformedSummaryRows,
  buildVisitsPerformedXlsxRows,
  visitsPerformedXlsxFilename,
} from "@/lib/dashboard/visits-performed-xlsx";

const TZ = "America/Sao_Paulo";

describe("buildVisitsPerformedXlsxRows", () => {
  it("monta uma linha por visita do gráfico", () => {
    const rows = buildVisitsPerformedXlsxRows(
      [
        {
          scheduled_start: "2026-09-05T18:00:00Z",
          status: "completed",
          assigned_team_member_id: null,
          user_id: "00000000-0000-4000-8000-000000000000",
          target_type: "patient",
          target_name: "Ana Lima",
          visit_kind_label: "Visita clínica / paciente",
          professional_label: "Maria",
          priority_label: "Alta",
          bucketKey: "2026-09-05",
          bucketLabel: "sáb 5",
        },
      ],
      TZ,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]).toBe("05/09/2026");
    expect(rows[0]?.[2]).toBe("Ana Lima");
    expect(rows[0]?.[3]).toBe("Paciente");
    expect(rows[0]?.[7]).toBe("Concluída");
    expect(rows[0]?.[8]).toBe("sáb 5");
  });
});

describe("buildVisitsPerformedSummaryRows", () => {
  it("espelha as barras do gráfico", () => {
    expect(
      buildVisitsPerformedSummaryRows([
        { key: "2026-09-05", label: "sáb 5", count: 2 },
        { key: "2026-09-06", label: "dom 6", count: 0 },
      ]),
    ).toEqual([
      ["sáb 5", 2],
      ["dom 6", 0],
    ]);
  });
});

describe("visitsPerformedXlsxFilename", () => {
  it("gera nome estável em português", () => {
    expect(visitsPerformedXlsxFilename("4 semanas", "2026-09-06")).toBe(
      "visitas-realizadas-4-semanas-2026-09-06.xlsx",
    );
  });
});
