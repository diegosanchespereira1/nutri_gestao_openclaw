import { describe, expect, it } from "vitest";

import { checkoutKindForPlan, sortPublicSignupPlans, toPublicSignupPlan } from "@/lib/signup/plan-checkout";
import type { PublicSignupPlan } from "@/lib/signup/types";

describe("checkoutKindForPlan", () => {
  it("free e preço zero vão sem Stripe", () => {
    expect(checkoutKindForPlan({ slug: "free", priceMonthlyCents: 0 })).toBe("free");
  });

  it("enterprise vai para vendas", () => {
    expect(checkoutKindForPlan({ slug: "enterprise", priceMonthlyCents: 0 })).toBe(
      "sales",
    );
  });

  it("starter/pro usam Stripe", () => {
    expect(checkoutKindForPlan({ slug: "starter", priceMonthlyCents: 4900 })).toBe(
      "stripe",
    );
    expect(checkoutKindForPlan({ slug: "pro", priceMonthlyCents: 9900 })).toBe(
      "stripe",
    );
  });
});

describe("toPublicSignupPlan", () => {
  it("marca anual só com preço anual", () => {
    const plan = toPublicSignupPlan({
      slug: "starter",
      name: "Starter",
      description: null,
      price_monthly_cents: 4900,
      price_annual_cents: null,
      max_clients: 15,
      max_establishments: 3,
      max_team_members: 1,
      max_patients: 50,
      feature_portal_externo: false,
      feature_pdf_export: true,
      feature_csv_import: true,
    });
    expect(plan.annualAvailable).toBe(false);
    expect(plan.checkoutKind).toBe("stripe");
    expect(plan.salesWhatsapp).toBeNull();
  });
});

describe("sortPublicSignupPlans", () => {
  it("ordena free → starter → pro → enterprise", () => {
    const plans = [
      { slug: "enterprise" },
      { slug: "pro" },
      { slug: "free" },
      { slug: "starter" },
    ] as PublicSignupPlan[];
    expect(sortPublicSignupPlans(plans).map((p) => p.slug)).toEqual([
      "free",
      "starter",
      "pro",
      "enterprise",
    ]);
  });
});
