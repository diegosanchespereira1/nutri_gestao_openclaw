import { describe, expect, it } from "vitest";

import {
  formatResponsibleHistoryDate,
  formatResponsibleLabel,
  mapAuditRowsToResponsibleHistory,
} from "@/lib/patients/responsible-history";

describe("formatResponsibleLabel", () => {
  it("devolve Nenhum para null", () => {
    expect(formatResponsibleLabel(null)).toBe("Nenhum");
  });

  it("mantém nome", () => {
    expect(formatResponsibleLabel("Ana")).toBe("Ana");
  });
});

describe("mapAuditRowsToResponsibleHistory", () => {
  const team = new Map([["tm-1", "Ana Silva"]]);
  const actors = new Map([["user-1", "Admin"]]);

  it("mapeia INSERT com responsável", () => {
    const events = mapAuditRowsToResponsibleHistory({
      rows: [
        {
          id: "1",
          operation: "INSERT",
          created_at: "2026-01-01T10:00:00Z",
          actor_user_id: "user-1",
          old_values: null,
          new_values: { responsible_team_member_id: "tm-1" },
        },
      ],
      teamMemberNames: team,
      actorNames: actors,
    });
    expect(events[0]?.summary).toContain("Ana Silva");
    expect(events[0]?.summary).toContain("Admin");
  });

  it("filtra UPDATE sem mudança de responsável", () => {
    const events = mapAuditRowsToResponsibleHistory({
      rows: [
        {
          id: "2",
          operation: "UPDATE",
          created_at: "2026-01-02T10:00:00Z",
          actor_user_id: null,
          old_values: { responsible_team_member_id: "tm-1" },
          new_values: { responsible_team_member_id: "tm-1" },
        },
      ],
      teamMemberNames: team,
      actorNames: actors,
    });
    expect(events).toHaveLength(0);
  });

  it("mapeia DELETE com último responsável", () => {
    const events = mapAuditRowsToResponsibleHistory({
      rows: [
        {
          id: "4",
          operation: "DELETE",
          created_at: "2026-01-04T10:00:00Z",
          actor_user_id: "user-1",
          old_values: { responsible_team_member_id: "tm-1" },
          new_values: null,
        },
      ],
      teamMemberNames: team,
      actorNames: actors,
    });
    expect(events[0]?.summary).toContain("eliminado");
    expect(events[0]?.summary).toContain("Ana Silva");
  });

  it("mapeia alteração de responsável", () => {
    const team2 = new Map([
      ["tm-1", "Ana"],
      ["tm-2", "Bruno"],
    ]);
    const events = mapAuditRowsToResponsibleHistory({
      rows: [
        {
          id: "3",
          operation: "UPDATE",
          created_at: "2026-01-03T10:00:00Z",
          actor_user_id: "user-1",
          old_values: { responsible_team_member_id: "tm-1" },
          new_values: { responsible_team_member_id: "tm-2" },
        },
      ],
      teamMemberNames: team2,
      actorNames: actors,
    });
    expect(events[0]?.summary).toContain("Ana");
    expect(events[0]?.summary).toContain("Bruno");
  });
});

describe("formatResponsibleHistoryDate", () => {
  it("formata ISO válido", () => {
    expect(formatResponsibleHistoryDate("2026-06-20T10:00:00Z")).toMatch(
      /\d{2}\/\d{2}\/\d{4}/,
    );
  });

  it("devolve original se inválido", () => {
    expect(formatResponsibleHistoryDate("invalid")).toBe("invalid");
  });
});
