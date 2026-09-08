import { describe, expect, it } from "vitest";

import { parseImportChildAssessmentsPayload } from "./import-child-assessment-rows";

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440000";

const validRow = {
  full_name: "Ana Silva",
  birth_date: "2020-03-01",
  recorded_at: "2026-03-15",
  sex: "female" as const,
  weight_kg: 16.2,
  height_cm: 102,
  clinical_notes: null,
};

describe("parseImportChildAssessmentsPayload", () => {
  it("exige cliente vinculado", () => {
    const r = parseImportChildAssessmentsPayload([validRow], {
      kind: "independent",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cliente/i);
  });

  it("rejeita vínculo sem clientId", () => {
    const r = parseImportChildAssessmentsPayload([validRow], {
      kind: "linked",
    });
    expect(r.ok).toBe(false);
  });

  it("aceita lote com cliente", () => {
    const r = parseImportChildAssessmentsPayload([validRow], {
      kind: "linked",
      clientId: CLIENT_ID,
      establishmentId: null,
      schoolGradeId: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.link.kind).toBe("linked");
      expect(r.link.clientId).toBe(CLIENT_ID);
    }
  });
});
