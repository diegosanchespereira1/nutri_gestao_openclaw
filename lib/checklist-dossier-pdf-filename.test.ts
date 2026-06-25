import { describe, expect, it } from "vitest";

import {
  buildChecklistDossierPdfFilename,
  contentDispositionWithFilename,
  formatChecklistDossierApprovalDate,
  resolveChecklistDossierPdfFilename,
} from "@/lib/checklist-dossier-pdf-filename";

describe("formatChecklistDossierApprovalDate", () => {
  it("formata DD-MM-AAAA", () => {
    expect(formatChecklistDossierApprovalDate("2026-06-20T15:00:00Z")).toMatch(
      /^\d{2}-\d{2}-\d{4}$/,
    );
  });
});

describe("buildChecklistDossierPdfFilename", () => {
  it("monta nome base", () => {
    const name = buildChecklistDossierPdfFilename({
      clientLabel: "Cliente A",
      areaLabel: "Cozinha",
      approvalIso: "2026-06-20T15:00:00Z",
      duplicateIndex: 0,
    });
    expect(name).toMatch(/^Checklist_.*\.pdf$/);
    expect(name).toContain("Cliente_A");
  });

  it("adiciona sufixo duplicado", () => {
    const name = buildChecklistDossierPdfFilename({
      clientLabel: "X",
      areaLabel: "Y",
      approvalIso: "2026-06-20T15:00:00Z",
      duplicateIndex: 2,
    });
    expect(name).toContain("_2.pdf");
  });
});

describe("contentDispositionWithFilename", () => {
  it("inclui filename e filename*", () => {
    const h = contentDispositionWithFilename(
      "attachment",
      "Relatório.pdf",
    );
    expect(h).toContain("attachment");
    expect(h).toContain("filename*=");
  });

  it("suporta inline", () => {
    expect(contentDispositionWithFilename("inline", "a.pdf")).toContain(
      "inline",
    );
  });
});

describe("resolveChecklistDossierPdfFilename", () => {
  function mockSupabaseReady() {
    let pdfExportCalls = 0;

    const makeChain = (table: string) => {
      const api = {
        select: () => api,
        eq: () => api,
        is: () => api,
        order: () => api,
        maybeSingle: async () => {
          if (table === "checklist_fill_pdf_exports" && pdfExportCalls === 0) {
            pdfExportCalls += 1;
            return {
              data: { id: "job-1", session_id: "sess-1", status: "ready" },
              error: null,
            };
          }
          if (table === "checklist_fill_sessions") {
            return {
              data: {
                dossier_approved_at: "2026-06-20T15:00:00Z",
                area_id: "area-1",
                establishment_id: "est-1",
              },
              error: null,
            };
          }
          if (table === "establishments") {
            return {
              data: {
                clients: { legal_name: "Cliente Legal", trade_name: null },
              },
              error: null,
            };
          }
          if (table === "establishment_areas") {
            return { data: { name: "Cozinha" }, error: null };
          }
          return { data: null, error: null };
        },
        then: (
          resolve: (v: { data: unknown; error: null }) => void,
          reject?: (e: unknown) => void,
        ) => {
          if (table === "checklist_fill_pdf_exports" && pdfExportCalls >= 1) {
            return Promise.resolve({
              data: [
                { id: "job-0", created_at: "2026-06-01" },
                { id: "job-1", created_at: "2026-06-02" },
              ],
              error: null,
            }).then(resolve, reject);
          }
          return Promise.resolve({ data: null, error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return api;
    };

    return { from: (t: string) => makeChain(t) } as never;
  }

  it("resolve nome quando job ready", async () => {
    const name = await resolveChecklistDossierPdfFilename(
      mockSupabaseReady(),
      "job-1",
    );
    expect(name).toMatch(/^Checklist_.*\.pdf$/);
    expect(name).toContain("_1.pdf");
  });

  it("devolve null se job não ready", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: "j", session_id: "s", status: "pending" },
              error: null,
            }),
          }),
        }),
      }),
    } as never;
    expect(await resolveChecklistDossierPdfFilename(supabase, "j")).toBeNull();
  });
});
