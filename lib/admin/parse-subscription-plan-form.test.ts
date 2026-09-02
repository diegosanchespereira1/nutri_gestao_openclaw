import { describe, expect, it } from "vitest";

import {
  centsToBRLInput,
  parseBRLToCents,
  parseSubscriptionPlanForm,
} from "./parse-subscription-plan-form";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const PLAN_ID = "11111111-1111-4111-8111-111111111111";

const validos = {
  id: PLAN_ID,
  slug: "starter",
  name: "Starter",
  description: "Para profissionais autônomos",
  price_monthly: "49,90",
  price_annual: "499,00",
  max_clients: "15",
  max_establishments: "3",
  max_team_members: "1",
  max_patients: "50",
  max_storage_mb: "1000",
  feature_portal_externo: "false",
  feature_pdf_export: "true",
  feature_csv_import: "on",
  feature_api_access: "0",
  is_active: "true",
  stripe_price_monthly_id: "price_monthly_abc",
  stripe_price_annual_id: "",
  sales_whatsapp: "",
};

describe("parseBRLToCents", () => {
  it("converte 49,90 para 4990", () => {
    expect(parseBRLToCents("49,90", "Preço")).toEqual({
      ok: true,
      value: 4990,
    });
  });

  it("aceita ponto decimal e R$", () => {
    expect(parseBRLToCents("R$ 49.90", "Preço")).toEqual({
      ok: true,
      value: 4990,
    });
  });

  it("aceita milhar pt-BR", () => {
    expect(parseBRLToCents("1.234,56", "Preço")).toEqual({
      ok: true,
      value: 123456,
    });
  });

  it("vazio vira 0", () => {
    expect(parseBRLToCents("", "Preço")).toEqual({ ok: true, value: 0 });
  });

  it("recusa preço negativo", () => {
    const r = parseBRLToCents("-10", "Preço mensal");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/negativo/i);
  });

  it("recusa texto inválido", () => {
    expect(parseBRLToCents("abc", "Preço").ok).toBe(false);
  });
});

describe("centsToBRLInput", () => {
  it("formata centavos para input", () => {
    expect(centsToBRLInput(4990)).toBe("49,90");
    expect(centsToBRLInput(0)).toBe("0");
    expect(centsToBRLInput(null)).toBe("0");
  });
});

describe("parseSubscriptionPlanForm", () => {
  it("lê um formulário válido", () => {
    const r = parseSubscriptionPlanForm(fd(validos));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      id: PLAN_ID,
      name: "Starter",
      description: "Para profissionais autônomos",
      price_monthly_cents: 4990,
      price_annual_cents: 49900,
      max_clients: 15,
      max_team_members: 1,
      feature_portal_externo: false,
      feature_pdf_export: true,
      feature_csv_import: true,
      feature_api_access: false,
      is_active: true,
      stripe_price_monthly_id: "price_monthly_abc",
      stripe_price_annual_id: null,
      sales_whatsapp: null,
    });
  });

  it("normaliza WhatsApp comercial", () => {
    const r = parseSubscriptionPlanForm(
      fd({ ...validos, sales_whatsapp: "(11) 98888-7777" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sales_whatsapp).toBe("5511988887777");
  });

  it("aceita limite -1 (ilimitado)", () => {
    const r = parseSubscriptionPlanForm(
      fd({ ...validos, max_clients: "-1", max_patients: "-1" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.max_clients).toBe(-1);
    expect(r.value.max_patients).toBe(-1);
  });

  it("ignora slug no POST (não devolve no value)", () => {
    const r = parseSubscriptionPlanForm(
      fd({ ...validos, slug: "enterprise" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).not.toHaveProperty("slug");
  });

  it("recusa id inválido", () => {
    expect(
      parseSubscriptionPlanForm(fd({ ...validos, id: "nao-uuid" })).ok,
    ).toBe(false);
  });

  it("recusa nome vazio", () => {
    const r = parseSubscriptionPlanForm(fd({ ...validos, name: " " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/nome/i);
  });

  it("recusa preço mensal negativo", () => {
    const r = parseSubscriptionPlanForm(
      fd({ ...validos, price_monthly: "-1,00" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/negativo/i);
  });

  it("anual vazio fica null", () => {
    const r = parseSubscriptionPlanForm(fd({ ...validos, price_annual: "" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.price_annual_cents).toBeNull();
  });
});
