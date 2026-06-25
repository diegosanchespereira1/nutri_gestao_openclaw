import { describe, expect, it } from "vitest";

import {
  formatDocumentHash,
  formatDocumentHashLines,
  generateDocumentHash,
} from "@/lib/checklists/document-hash";

describe("generateDocumentHash", () => {
  it("é determinístico", () => {
    const input = {
      sessionId: "sess-1",
      approvedAtIso: "2026-01-01T00:00:00Z",
      professionalName: " Ana ",
      crn: " CRN-1 ",
      clientSignerName: "Cliente",
      professionalSignatureDataUrl: "data:image/png;base64,abc",
      clientSignatureDataUrl: null,
    };
    expect(generateDocumentHash(input)).toBe(generateDocumentHash(input));
    expect(generateDocumentHash(input)).toHaveLength(64);
  });

  it("muda com conteúdo diferente", () => {
    const base = {
      sessionId: "sess-1",
      approvedAtIso: "2026-01-01T00:00:00Z",
      professionalName: "Ana",
      crn: "1",
      clientSignerName: null,
      professionalSignatureDataUrl: null,
      clientSignatureDataUrl: null,
    };
    expect(generateDocumentHash(base)).not.toBe(
      generateDocumentHash({ ...base, sessionId: "sess-2" }),
    );
  });
});

describe("formatDocumentHash", () => {
  it("agrupa de 8 em 8", () => {
    const hex = "a".repeat(64);
    expect(formatDocumentHash(hex).split(" ")).toHaveLength(8);
  });
});

describe("formatDocumentHashLines", () => {
  it("divide em duas linhas", () => {
    const hex = "0123456789abcdef".repeat(4);
    const [l1, l2] = formatDocumentHashLines(hex);
    expect(l1.split(" ")).toHaveLength(4);
    expect(l2.split(" ")).toHaveLength(4);
  });
});
