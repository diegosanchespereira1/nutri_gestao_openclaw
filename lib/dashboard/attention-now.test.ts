import { describe, expect, it } from "vitest";

import { isAttentionNow, isOverdueDays } from "@/lib/dashboard/attention-now";

describe("isAttentionNow", () => {
  it("inclui vencidos e prazos até 7 dias", () => {
    expect(isAttentionNow(-3)).toBe(true);
    expect(isAttentionNow(0)).toBe(true);
    expect(isAttentionNow(7)).toBe(true);
    expect(isAttentionNow(8)).toBe(false);
  });
});

describe("isOverdueDays", () => {
  it("só negativo", () => {
    expect(isOverdueDays(-1)).toBe(true);
    expect(isOverdueDays(0)).toBe(false);
  });
});
