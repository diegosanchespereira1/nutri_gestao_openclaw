import { describe, expect, it } from "vitest";

import { resolveFinanceiroInitialTab } from "./financeiro-tab";

describe("resolveFinanceiroInitialTab", () => {
  it("respeita tab explícita", () => {
    expect(resolveFinanceiroInitialTab("resumo", true)).toBe("resumo");
    expect(resolveFinanceiroInitialTab("operacoes", false)).toBe("operacoes");
  });
  it("sem tab, bump vai para operações", () => {
    expect(resolveFinanceiroInitialTab(undefined, true)).toBe("operacoes");
  });
  it("sem tab nem bump, resumo", () => {
    expect(resolveFinanceiroInitialTab(undefined, false)).toBe("resumo");
  });
});
