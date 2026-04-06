import { describe, expect, it } from "vitest";

import {
  isPopDraftUnchanged,
  normalizePopBodyForCompare,
} from "./pop-content-compare";

describe("normalizePopBodyForCompare", () => {
  it("unifica CRLF e CR", () => {
    expect(normalizePopBodyForCompare("a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("isPopDraftUnchanged", () => {
  it("detecta igual após trim no título", () => {
    expect(
      isPopDraftUnchanged("Título", "corpo", "  Título  ", "corpo"),
    ).toBe(true);
  });

  it("detecta mudança no corpo", () => {
    expect(isPopDraftUnchanged("T", "a", "T", "b")).toBe(false);
  });

  it("ignora só diferença CRLF no corpo", () => {
    expect(
      isPopDraftUnchanged("T", "linha1\nlinha2", "T", "linha1\r\nlinha2"),
    ).toBe(true);
  });
});
