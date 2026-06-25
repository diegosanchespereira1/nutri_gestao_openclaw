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
});
