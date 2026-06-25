import { describe, expect, it } from "vitest";

import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";

describe("parseAppliesTo", () => {
  it("filtra tipos válidos", () => {
    expect(parseAppliesTo(["escola", "invalid", "hospital"])).toEqual([
      "escola",
      "hospital",
    ]);
  });

  it("devolve vazio para não-array", () => {
    expect(parseAppliesTo(null)).toEqual([]);
  });
});
