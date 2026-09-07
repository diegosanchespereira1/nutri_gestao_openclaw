import { describe, expect, it } from "vitest";

import {
  agendaHoursOutOfRangeMessage,
  isIsoWithinAgendaHours,
  isLocalDatetimeWithinAgendaHours,
  isMinutesWithinAgendaHours,
} from "@/lib/visits/agenda-hours";

const TZ = "America/Sao_Paulo";

describe("isMinutesWithinAgendaHours", () => {
  it("aceita o início e o horário de fim, rejeita depois do fecho", () => {
    expect(isMinutesWithinAgendaHours(8 * 60, 8, 19)).toBe(true);
    expect(isMinutesWithinAgendaHours(19 * 60, 8, 19)).toBe(true);
    expect(isMinutesWithinAgendaHours(19 * 60 + 1, 8, 19)).toBe(false);
  });
});

describe("isLocalDatetimeWithinAgendaHours", () => {
  it("aceita o horário de fim e bloqueia um minuto depois", () => {
    expect(isLocalDatetimeWithinAgendaHours("2026-09-07T07:59", 8, 19)).toBe(
      false,
    );
    expect(isLocalDatetimeWithinAgendaHours("2026-09-07T08:00", 8, 19)).toBe(
      true,
    );
    expect(isLocalDatetimeWithinAgendaHours("2026-09-07T19:00", 8, 19)).toBe(
      true,
    );
    expect(isLocalDatetimeWithinAgendaHours("2026-09-07T19:01", 8, 19)).toBe(
      false,
    );
  });
});

describe("isIsoWithinAgendaHours", () => {
  it("avalia no fuso da agenda", () => {
    expect(isIsoWithinAgendaHours("2026-06-20T11:00:00.000Z", TZ, 8, 19)).toBe(
      true,
    ); // 08:00 BRT
    expect(isIsoWithinAgendaHours("2026-06-20T10:59:00.000Z", TZ, 8, 19)).toBe(
      false,
    ); // 07:59 BRT
    expect(isIsoWithinAgendaHours("2026-06-20T22:00:00.000Z", TZ, 8, 19)).toBe(
      true,
    ); // 19:00 BRT
    expect(isIsoWithinAgendaHours("2026-06-20T22:01:00.000Z", TZ, 8, 19)).toBe(
      false,
    ); // 19:01 BRT
  });
});

describe("agendaHoursOutOfRangeMessage", () => {
  it("cita o intervalo configurado", () => {
    expect(agendaHoursOutOfRangeMessage(8, 18)).toBe(
      "Este horário está fora do intervalo configurado da agenda (08:00 às 18:00).",
    );
  });
});
