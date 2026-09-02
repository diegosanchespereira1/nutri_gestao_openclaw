import { normalizeWhatsAppPhone } from "@/lib/signup/whatsapp";

/**
 * Parser do formulário de edição de planos no painel super_admin.
 * Preços entram em reais (ex.: "49,90") e saem em centavos.
 * Limites aceitam -1 (ilimitado). O slug nunca é alterado pelo form.
 */

export type SubscriptionPlanFormInput = {
  id: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_annual_cents: number | null;
  max_clients: number;
  max_establishments: number;
  max_team_members: number;
  max_patients: number;
  max_storage_mb: number;
  feature_portal_externo: boolean;
  feature_pdf_export: boolean;
  feature_csv_import: boolean;
  feature_api_access: boolean;
  is_active: boolean;
  stripe_price_monthly_id: string | null;
  stripe_price_annual_id: string | null;
  sales_whatsapp: string | null;
};

export type ParsedSubscriptionPlanForm =
  | { ok: true; value: SubscriptionPlanFormInput }
  | { ok: false; error: string };

const MAX_LIMIT = 100_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  return raw === "on" || raw === "true" || raw === "1";
}

/**
 * Converte entrada em reais ("49,90", "R$ 49.90", "1.234,56") para centavos.
 * Vazio → 0. Negativo → erro.
 */
export function parseBRLToCents(
  raw: FormDataEntryValue | null,
  rotulo: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const texto = String(raw ?? "")
    .trim()
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "");

  if (!texto) return { ok: true, value: 0 };
  if (texto.startsWith("-")) {
    return { ok: false, error: `${rotulo}: o preço não pode ser negativo.` };
  }

  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(texto)) {
    // 1.234,56
    normalized = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{1,2}$/.test(texto)) {
    // 49,90
    normalized = texto.replace(",", ".");
  } else if (/^\d+(\.\d{1,2})?$/.test(texto)) {
    // 49 ou 49.90
    normalized = texto;
  } else {
    return { ok: false, error: `${rotulo}: informe um valor em reais válido.` };
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: `${rotulo}: informe um valor em reais válido.` };
  }
  if (amount < 0) {
    return { ok: false, error: `${rotulo}: o preço não pode ser negativo.` };
  }
  const cents = Math.round(amount * 100);
  if (cents > 100_000_000) {
    return { ok: false, error: `${rotulo}: valor acima do permitido.` };
  }
  return { ok: true, value: cents };
}

function parsePlanLimit(
  raw: FormDataEntryValue | null,
  rotulo: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const texto = String(raw ?? "").trim();
  if (!texto) return { ok: true, value: 0 };
  if (!/^-?\d+$/.test(texto)) {
    return {
      ok: false,
      error: `${rotulo}: informe um número inteiro (-1 = ilimitado).`,
    };
  }
  const n = Number(texto);
  if (n < -1) {
    return {
      ok: false,
      error: `${rotulo}: use -1 para ilimitado ou um valor ≥ 0.`,
    };
  }
  if (n > MAX_LIMIT) {
    return { ok: false, error: `${rotulo}: valor máximo é ${MAX_LIMIT}.` };
  }
  return { ok: true, value: n };
}

function parseOptionalStripeId(raw: FormDataEntryValue | null): string | null {
  const texto = String(raw ?? "").trim();
  return texto.length > 0 ? texto.slice(0, 200) : null;
}

export function centsToBRLInput(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "0";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function parseSubscriptionPlanForm(
  formData: FormData,
): ParsedSubscriptionPlanForm {
  // Slug no POST é ignorado de propósito — planos seed têm slug fixo no código.
  void formData.get("slug");

  const id = String(formData.get("id") ?? "").trim();
  if (!id || !UUID_RE.test(id)) {
    return { ok: false, error: "Identificador do plano inválido." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { ok: false, error: "Informe o nome do plano." };
  }
  if (name.length > 80) {
    return { ok: false, error: "Nome do plano demasiado longo." };
  }

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description =
    descriptionRaw.length > 0 ? descriptionRaw.slice(0, 500) : null;

  const monthly = parseBRLToCents(
    formData.get("price_monthly"),
    "Preço mensal",
  );
  if (!monthly.ok) return monthly;

  const annualRaw = String(formData.get("price_annual") ?? "").trim();
  let price_annual_cents: number | null = null;
  if (annualRaw) {
    const annual = parseBRLToCents(formData.get("price_annual"), "Preço anual");
    if (!annual.ok) return annual;
    price_annual_cents = annual.value > 0 ? annual.value : null;
  }

  const max_clients = parsePlanLimit(formData.get("max_clients"), "Clientes");
  if (!max_clients.ok) return max_clients;

  const max_establishments = parsePlanLimit(
    formData.get("max_establishments"),
    "Estabelecimentos",
  );
  if (!max_establishments.ok) return max_establishments;

  const max_team_members = parsePlanLimit(
    formData.get("max_team_members"),
    "Membros de equipe",
  );
  if (!max_team_members.ok) return max_team_members;

  const max_patients = parsePlanLimit(formData.get("max_patients"), "Pacientes");
  if (!max_patients.ok) return max_patients;

  const max_storage_mb = parsePlanLimit(
    formData.get("max_storage_mb"),
    "Storage (MB)",
  );
  if (!max_storage_mb.ok) return max_storage_mb;

  const whatsapp = normalizeWhatsAppPhone(
    String(formData.get("sales_whatsapp") ?? ""),
  );
  if (!whatsapp.ok) return whatsapp;

  return {
    ok: true,
    value: {
      id,
      name,
      description,
      price_monthly_cents: monthly.value,
      price_annual_cents,
      max_clients: max_clients.value,
      max_establishments: max_establishments.value,
      max_team_members: max_team_members.value,
      max_patients: max_patients.value,
      max_storage_mb: max_storage_mb.value,
      feature_portal_externo: parseCheckbox(
        formData.get("feature_portal_externo"),
      ),
      feature_pdf_export: parseCheckbox(formData.get("feature_pdf_export")),
      feature_csv_import: parseCheckbox(formData.get("feature_csv_import")),
      feature_api_access: parseCheckbox(formData.get("feature_api_access")),
      is_active: parseCheckbox(formData.get("is_active")),
      stripe_price_monthly_id: parseOptionalStripeId(
        formData.get("stripe_price_monthly_id"),
      ),
      stripe_price_annual_id: parseOptionalStripeId(
        formData.get("stripe_price_annual_id"),
      ),
      sales_whatsapp: whatsapp.value,
    },
  };
}
