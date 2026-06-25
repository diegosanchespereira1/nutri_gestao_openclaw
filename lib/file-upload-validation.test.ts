import { describe, expect, it } from "vitest";

import {
  generateSafeFilename,
  validateDocumentFile,
  validateImageFile,
  validateSpreadsheetFile,
} from "@/lib/file-upload-validation";

function mockFile(type: string, size: number, name = "file.bin"): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("validateImageFile", () => {
  it("aceita JPEG", () => {
    expect(
      validateImageFile(mockFile("image/jpeg", 100, "photo.jpg")),
    ).toBeNull();
  });

  it("rejeita tipo inválido", () => {
    expect(
      validateImageFile(mockFile("application/pdf", 100)),
    ).toMatchObject({ field: "file" });
  });

  it("rejeita ficheiro vazio", () => {
    expect(validateImageFile(mockFile("image/png", 0, "x.png"))).toMatchObject({
      error: expect.stringContaining("vazio"),
    });
  });

  it("rejeita ficheiro grande", () => {
    expect(
      validateImageFile(mockFile("image/png", 6 * 1024 * 1024, "x.png")),
    ).toMatchObject({ error: expect.stringContaining("grande") });
  });
});

describe("validateDocumentFile", () => {
  it("aceita PDF", () => {
    expect(
      validateDocumentFile(mockFile("application/pdf", 100, "doc.pdf")),
    ).toBeNull();
  });

  it("rejeita tipo inválido", () => {
    expect(
      validateDocumentFile(mockFile("image/png", 100)),
    ).toMatchObject({ error: expect.stringContaining("inválido") });
  });

  it("rejeita ficheiro grande", () => {
    expect(
      validateDocumentFile(mockFile("application/pdf", 11 * 1024 * 1024)),
    ).toMatchObject({ error: expect.stringContaining("grande") });
  });

  it("rejeita ficheiro vazio", () => {
    expect(
      validateDocumentFile(mockFile("application/pdf", 0)),
    ).toMatchObject({ error: expect.stringContaining("vazio") });
  });
});

describe("validateSpreadsheetFile", () => {
  it("aceita CSV", () => {
    expect(
      validateSpreadsheetFile(mockFile("text/csv", 100, "data.csv")),
    ).toBeNull();
  });

  it("rejeita tipo inválido", () => {
    expect(
      validateSpreadsheetFile(mockFile("application/pdf", 100)),
    ).toMatchObject({ field: "file" });
  });

  it("rejeita ficheiro grande", () => {
    expect(
      validateSpreadsheetFile(mockFile("text/csv", 11 * 1024 * 1024)),
    ).toMatchObject({ error: expect.stringContaining("grande") });
  });

  it("rejeita ficheiro vazio", () => {
    expect(
      validateSpreadsheetFile(mockFile("text/csv", 0)),
    ).toMatchObject({ error: expect.stringContaining("vazio") });
  });
});

describe("generateSafeFilename", () => {
  it("gera nome seguro com prefixo", () => {
    const name = generateSafeFilename("Foto@Cliente!.png", "avatar");
    expect(name).toMatch(/^avatar_[a-f0-9]+_Foto_Cliente_\.png$/);
  });
});
