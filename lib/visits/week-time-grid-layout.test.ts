import { describe, expect, it } from "vitest";

import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import {
  PX_PER_HOUR,
  agendaHourRows,
  isNowWithinAgendaWindow,
  layoutVisitsForDayColumn,
} from "@/lib/visits/week-time-grid-layout";

const TZ = "America/Sao_Paulo";

function visit(id: string, scheduledStart: string): ScheduledVisitWithTargets {
  return {
    id,
    user_id: "user-ana",
    target_type: "establishment",
    establishment_id: "est-1",
    patient_id: null,
    scheduled_start: scheduledStart,
    priority: "normal",
    status: "scheduled",
    visit_kind: "technical_compliance",
    assigned_team_member_id: "tm-ana",
    notes: null,
    created_at: scheduledStart,
    updated_at: scheduledStart,
    establishments: {
      id: "est-1",
      name: "Hospital TESTE",
      client_id: "cli-1",
      clients: { legal_name: "Hospital TESTE Ltda", trade_name: "Hospital TESTE" },
    },
    patients: null,
    team_members: { id: "tm-ana", full_name: "Ana Lima", job_role: "nutricionista" },
  };
}

describe("agendaHourRows", () => {
  it("gera horas do início ao fim, inclusive", () => {
    expect(agendaHourRows(8, 19)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
  });

  it("não gera horas se o intervalo for inválido", () => {
    expect(agendaHourRows(18, 18)).toEqual([18]);
    expect(agendaHourRows(20, 8)).toEqual([]);
  });
});

describe("isNowWithinAgendaWindow", () => {
  it("aceita o instante no horário de fim", () => {
    expect(isNowWithinAgendaWindow(19 * 60, 8, 19)).toBe(true);
  });

  it("rejeita antes do início e depois da última hora", () => {
    expect(isNowWithinAgendaWindow(7 * 60 + 59, 8, 19)).toBe(false);
    expect(isNowWithinAgendaWindow(20 * 60, 8, 19)).toBe(false);
  });
});

describe("layoutVisitsForDayColumn", () => {
  it("omite visitas totalmente antes ou depois da janela", () => {
    const placed = layoutVisitsForDayColumn(
      [
        visit("antes", "2026-06-20T08:00:00.000Z"), // 05:00 BRT
        visit("depois", "2026-06-20T23:00:00.000Z"), // 20:00 BRT
      ],
      TZ,
      8,
      19,
    );
    expect(placed).toEqual([]);
  });

  it("posiciona visita no horário de fim sem sair da grelha", () => {
    const placed = layoutVisitsForDayColumn(
      [visit("fecho", "2026-06-20T22:00:00.000Z")], // 19:00 BRT
      TZ,
      8,
      19,
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].topPx).toBe(11 * PX_PER_HOUR);
    expect(placed[0].topPx + placed[0].heightPx).toBeLessThanOrEqual(
      12 * PX_PER_HOUR,
    );
  });

  it("posiciona visita dentro da janela sem top negativo", () => {
    const placed = layoutVisitsForDayColumn(
      [visit("dentro", "2026-06-20T12:00:00.000Z")], // 09:00 BRT
      TZ,
      8,
      19,
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].topPx).toBe(PX_PER_HOUR);
    expect(placed[0].topPx + placed[0].heightPx).toBeLessThanOrEqual(
      12 * PX_PER_HOUR,
    );
  });

  it("recorta visita que atravessa o fecho da agenda", () => {
    const placed = layoutVisitsForDayColumn(
      [visit("borda", "2026-06-20T21:30:00.000Z")], // 18:30 BRT
      TZ,
      8,
      19,
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].topPx).toBeGreaterThan(0);
    expect(placed[0].topPx + placed[0].heightPx).toBeLessThanOrEqual(
      12 * PX_PER_HOUR,
    );
  });
});
