import { describe, expect, it } from "vitest";

import { redactSupabaseUrlsForPdf } from "./redact-storage-urls";

describe("redactSupabaseUrlsForPdf", () => {
  it("substitui URL do projeto Supabase", () => {
    const raw =
      "Ver https://abcdefgh.supabase.co/storage/v1/object/sign/x/y?token=1 fim";
    expect(redactSupabaseUrlsForPdf(raw)).toBe(
      "Ver [ligação interna removida] fim",
    );
  });

  it("não altera texto sem supabase", () => {
    expect(redactSupabaseUrlsForPdf("Nota normal")).toBe("Nota normal");
  });
});
