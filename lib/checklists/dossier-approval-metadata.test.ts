import { describe, expect, it } from "vitest";

import {
  formatDossierApprovalAuditLine,
  formatDossierApprovedAtPtBr,
} from "@/lib/checklists/dossier-approval-metadata";

describe("formatDossierApprovedAtPtBr", () => {
  it("formata data/hora em pt-BR", () => {
    const s = formatDossierApprovedAtPtBr("2026-06-20T15:00:00Z");
    expect(s).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("inclui segundos quando pedido", () => {
    const s = formatDossierApprovedAtPtBr("2026-06-20T15:00:00Z", {
      includeSeconds: true,
    });
    expect(s.length).toBeGreaterThan(10);
  });

  it("devolve ISO em caso de data inválida", () => {
    expect(formatDossierApprovedAtPtBr("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDossierApprovalAuditLine", () => {
  it("inclui IP conhecido", () => {
    expect(
      formatDossierApprovalAuditLine("2026-06-20T15:00:00Z", "192.168.0.1"),
    ).toContain("192.168.0.1");
  });

  it("usa desconhecido sem IP", () => {
    expect(
      formatDossierApprovalAuditLine("2026-06-20T15:00:00Z", "  "),
    ).toContain("desconhecido");
  });
});
