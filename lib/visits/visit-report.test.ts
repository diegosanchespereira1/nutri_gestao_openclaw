import { describe, expect, it } from "vitest";

import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import {
  ALL_REPORT_FILTER,
  buildVisitReportRows,
  filterVisitReportRows,
  groupVisitReportRows,
  startOfMonthDayKey,
  visitClientRef,
  visitReportKpis,
} from "@/lib/visits/visit-report";
import { ALL_PROFESSIONALS } from "@/lib/visits/visit-professional-filter";

const TZ = "America/Sao_Paulo";

function visit(
  partial: Partial<ScheduledVisitWithTargets> & {
    id: string;
    scheduled_start: string;
  },
): ScheduledVisitWithTargets {
  return {
    user_id: "user-ana",
    target_type: "establishment",
    establishment_id: "est-1",
    patient_id: null,
    priority: "normal",
    status: "completed",
    visit_kind: "technical_compliance",
    assigned_team_member_id: "tm-ana",
    notes: null,
    created_at: partial.scheduled_start,
    updated_at: partial.scheduled_start,
    establishments: {
      id: "est-1",
      name: "Hospital TESTE",
      client_id: "cli-1",
      clients: { legal_name: "Hospital TESTE Ltda", trade_name: "Hospital TESTE" },
    },
    patients: null,
    team_members: { id: "tm-ana", full_name: "Ana Lima", job_role: "nutricionista" },
    ...partial,
  };
}

describe("visitClientRef", () => {
  it("usa o cliente do estabelecimento", () => {
    const ref = visitClientRef(
      visit({ id: "v1", scheduled_start: "2026-09-01T12:00:00.000Z" }),
    );
    expect(ref.key).toBe("client:cli-1");
    expect(ref.label).toBe("Hospital TESTE");
  });
});

describe("startOfMonthDayKey", () => {
  it("corta para o dia 1", () => {
    expect(startOfMonthDayKey("2026-09-07")).toBe("2026-09-01");
  });
});

describe("relatório de visitas", () => {
  const rows = buildVisitReportRows(
    [
      visit({ id: "v1", scheduled_start: "2026-09-01T12:00:00.000Z" }),
      visit({
        id: "v2",
        scheduled_start: "2026-09-03T15:00:00.000Z",
        visit_kind: "audit",
        assigned_team_member_id: "tm-diego",
        user_id: "user-diego",
        team_members: {
          id: "tm-diego",
          full_name: "Diego Sanches",
          job_role: "nutricionista",
        },
      }),
      visit({
        id: "v3",
        scheduled_start: "2026-09-03T15:00:00.000Z",
        status: "scheduled",
      }),
    ],
    [],
    TZ,
  );

  it("só inclui visitas concluídas", () => {
    expect(rows).toHaveLength(2);
  });

  it("filtra por profissional e atividade", () => {
    const filtered = filterVisitReportRows(
      rows,
      {
        fromDay: "2026-09-01",
        toDay: "2026-09-07",
        clientKey: ALL_REPORT_FILTER,
        professionalKey: "tm-diego",
        kind: "audit",
      },
      new Map(),
    );
    expect(filtered.map((row) => row.id)).toEqual(["v2"]);
  });

  it("agrupa por profissional com totais", () => {
    const groups = groupVisitReportRows(rows, "nutri");
    expect(groups[0]?.visits).toBeGreaterThanOrEqual(1);
    expect(groups.map((group) => group.label)).toEqual(
      expect.arrayContaining(["Ana Lima", "Diego Sanches"]),
    );
  });

  it("calcula o pulso do recorte", () => {
    expect(visitReportKpis(rows)).toEqual({
      completed: 2,
      professionals: 2,
      clients: 1,
      kinds: 2,
    });
  });

  it("respeita o período civil", () => {
    const filtered = filterVisitReportRows(
      rows,
      {
        fromDay: "2026-09-02",
        toDay: "2026-09-07",
        clientKey: ALL_REPORT_FILTER,
        professionalKey: ALL_PROFESSIONALS,
        kind: ALL_REPORT_FILTER,
      },
      new Map(),
    );
    expect(filtered.map((row) => row.id)).toEqual(["v2"]);
  });
});
