import { describe, expect, it } from "vitest";

import { adminNavItem, appNavGroups, appNavItems } from "@/lib/app-nav";

describe("app-nav", () => {
  it("grupos têm itens", () => {
    expect(appNavGroups.length).toBeGreaterThan(0);
    expect(appNavGroups.every((g) => g.items.length > 0)).toBe(true);
  });

  it("appNavItems é flatten dos grupos", () => {
    const flat = appNavGroups.flatMap((g) => g.items);
    expect(appNavItems).toEqual(flat);
  });

  it("admin item aponta para /admin", () => {
    expect(adminNavItem.href).toBe("/admin");
  });

  it("marca POP, ficha técnica e matérias-primas como em breve", () => {
    const assessoria = appNavGroups.find((g) => g.label === "Assessoria Nutricional");
    expect(assessoria?.items.filter((item) => item.comingSoon).map((item) => item.href)).toEqual([
      "/pops",
      "/ficha-tecnica",
      "/materias-primas",
    ]);
  });
});
