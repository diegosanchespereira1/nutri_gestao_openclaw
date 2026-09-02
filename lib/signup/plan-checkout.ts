import type { PublicSignupPlan, SignupCheckoutKind } from "@/lib/signup/types";

/** Ordem fixa dos cards no cadastro público. */
export const PUBLIC_PLAN_SLUG_ORDER = [
  "free",
  "starter",
  "pro",
  "enterprise",
] as const;

export function checkoutKindForPlan(plan: {
  slug: string;
  priceMonthlyCents: number;
}): SignupCheckoutKind {
  if (plan.slug === "enterprise") return "sales";
  if (plan.slug === "free" || plan.priceMonthlyCents <= 0) return "free";
  return "stripe";
}

export function toPublicSignupPlan(row: {
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_annual_cents: number | null;
  max_clients: number;
  max_establishments: number;
  max_team_members: number;
  max_patients: number;
  feature_portal_externo: boolean;
  feature_pdf_export: boolean;
  feature_csv_import: boolean;
  sales_whatsapp?: string | null;
}): PublicSignupPlan {
  const priceMonthlyCents = Number(row.price_monthly_cents) || 0;
  const priceAnnualCents =
    row.price_annual_cents == null ? null : Number(row.price_annual_cents);
  const salesWhatsappRaw = String(row.sales_whatsapp ?? "").trim();
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceMonthlyCents,
    priceAnnualCents,
    maxClients: Number(row.max_clients) || 0,
    maxEstablishments: Number(row.max_establishments) || 0,
    maxTeamMembers: Number(row.max_team_members) || 0,
    maxPatients: Number(row.max_patients) || 0,
    featurePortalExterno: Boolean(row.feature_portal_externo),
    featurePdfExport: Boolean(row.feature_pdf_export),
    featureCsvImport: Boolean(row.feature_csv_import),
    checkoutKind: checkoutKindForPlan({
      slug: row.slug,
      priceMonthlyCents,
    }),
    annualAvailable: priceAnnualCents != null && priceAnnualCents > 0,
    salesWhatsapp: salesWhatsappRaw.length > 0 ? salesWhatsappRaw : null,
  };
}

export function sortPublicSignupPlans(
  plans: PublicSignupPlan[],
): PublicSignupPlan[] {
  const rank = new Map(
    PUBLIC_PLAN_SLUG_ORDER.map((slug, index) => [slug, index]),
  );
  return [...plans].sort((a, b) => {
    const ra = rank.get(a.slug as (typeof PUBLIC_PLAN_SLUG_ORDER)[number]);
    const rb = rank.get(b.slug as (typeof PUBLIC_PLAN_SLUG_ORDER)[number]);
    if (ra == null && rb == null) return a.slug.localeCompare(b.slug);
    if (ra == null) return 1;
    if (rb == null) return -1;
    return ra - rb;
  });
}

export function stripePriceColumn(
  interval: "month" | "year",
): "stripe_price_monthly_id" | "stripe_price_annual_id" {
  return interval === "year" ? "stripe_price_annual_id" : "stripe_price_monthly_id";
}
