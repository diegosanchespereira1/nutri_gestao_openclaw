import { describe, expect, it } from "vitest";

import { sanitizeStorageFilename } from "@/lib/utils/storage-filename";

describe("sanitizeStorageFilename", () => {
  it("remove path traversal", () => {
    expect(sanitizeStorageFilename("../../etc/passwd")).not.toContain("..");
  });

  it("substitui caracteres inválidos", () => {
    expect(sanitizeStorageFilename("foto@#$.png")).toContain("foto");
  });

  it("fallback ficheiro", () => {
    expect(sanitizeStorageFilename("   ")).toBe("ficheiro");
  });
});
