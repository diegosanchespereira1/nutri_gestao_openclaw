"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseEstablishmentType } from "@/lib/constants/establishment-types";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-document";

export type OnboardingWorkContext = "institutional" | "clinical" | "both";

export type CompleteOnboardingResult =
  | { ok: true }
  | { ok: false; error: string };

function parseWorkContext(raw: unknown): OnboardingWorkContext | null {
  if (
    raw === "institutional" ||
    raw === "clinical" ||
    raw === "both"
  ) {
    return raw;
  }
  return null;
}

function parseDocumentPfPj(
  kind: "pf" | "pj",
  raw: string,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (kind === "pf") {
    if (!isValidCpf(digits)) return { ok: false, error: "CPF inválido." };
    return { ok: true, value: digits };
  }
  if (!isValidCnpj(digits)) return { ok: false, error: "CNPJ inválido." };
  return { ok: true, value: digits };
}

/**
 * Story 2.7: cria primeiro cliente (e estabelecimento PJ se aplicável), grava contexto e fecha onboarding.
 */
export async function completeOnboardingAction(
  _prev: CompleteOnboardingResult | undefined,
  formData: FormData,
): Promise<CompleteOnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed_at) {
    redirect("/inicio");
  }

  const work_context = parseWorkContext(formData.get("work_context"));
  if (!work_context) {
    return { ok: false, error: "Selecione como trabalha (institucional, clínico ou ambos)." };
  }

  const needsEstablishment =
    work_context === "institutional" || work_context === "both";

  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return {
      ok: false,
      error: needsEstablishment
        ? "Indique a razão social do cliente (empresa)."
        : "Indique o nome do primeiro cliente (particular).",
    };
  }

  const docRaw = String(formData.get("document_id") ?? "");
  const kind: "pf" | "pj" = needsEstablishment ? "pj" : "pf";
  const parsedDoc = parseDocumentPfPj(kind, docRaw);
  if (!parsedDoc.ok) {
    return { ok: false, error: parsedDoc.error };
  }
  const document_id = parsedDoc.value;

  if (needsEstablishment) {
    const establishment_type = parseEstablishmentType(
      formData.get("establishment_type"),
    );
    if (!establishment_type) {
      return { ok: false, error: "Selecione o tipo de estabelecimento." };
    }

    const estName = String(formData.get("establishment_name") ?? "").trim();
    if (!estName) {
      return { ok: false, error: "Indique o nome do estabelecimento." };
    }

    const address_line1 = String(formData.get("address_line1") ?? "").trim();
    if (!address_line1) {
      return {
        ok: false,
        error: "Indique a morada (linha 1) do estabelecimento.",
      };
    }

    const address_line2Raw = String(formData.get("address_line2") ?? "").trim();
    const address_line2 =
      address_line2Raw.length > 0 ? address_line2Raw : null;

    const cityRaw = String(formData.get("city") ?? "").trim();
    const city = cityRaw.length > 0 ? cityRaw : null;

    const stateRaw = String(formData.get("state") ?? "")
      .trim()
      .toUpperCase();
    if (stateRaw.length !== 2) {
      return {
        ok: false,
        error:
          "Indique a UF com 2 letras (ex.: SP) para sugerirmos portarias aplicáveis.",
      };
    }

    const postalRaw = String(formData.get("postal_code") ?? "").trim();
    const postal_code = postalRaw.length > 0 ? postalRaw : null;

    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .insert({
        owner_user_id: user.id,
        kind: "pj",
        legal_name,
        trade_name: null,
        document_id,
        email: null,
        phone: null,
        notes: null,
        lifecycle_status: "ativo",
        business_segment: null,
        activated_at: null,
        state_registration: null,
        municipal_registration: null,
        sanitary_license: null,
        website_url: null,
        social_links: {},
        logo_storage_path: null,
        legal_rep_full_name: null,
        legal_rep_document_id: null,
        legal_rep_role: null,
        legal_rep_email: null,
        legal_rep_phone: null,
        technical_rep_full_name: null,
        technical_rep_professional_id: null,
        technical_rep_email: null,
        technical_rep_phone: null,
      })
      .select("id")
      .single();

    if (clientErr || !clientRow) {
      return {
        ok: false,
        error: "Não foi possível criar o cliente empresarial. Tente novamente.",
      };
    }

    const clientId = clientRow.id as string;

    const { error: estErr } = await supabase.from("establishments").insert({
      client_id: clientId,
      name: estName,
      establishment_type,
      address_line1,
      address_line2,
      city,
      state: stateRaw,
      postal_code,
    });

    if (estErr) {
      await supabase.from("clients").delete().eq("id", clientId);
      return {
        ok: false,
        error: "Não foi possível criar o estabelecimento. Tente novamente.",
      };
    }
  } else {
    const { error: clientErr } = await supabase.from("clients").insert({
      owner_user_id: user.id,
      kind: "pf",
      legal_name,
      trade_name: null,
      document_id,
      email: null,
      phone: null,
      notes: null,
    });

    if (clientErr) {
      return {
        ok: false,
        error: "Não foi possível criar o cliente particular. Tente novamente.",
      };
    }
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      work_context,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (profErr) {
    return {
      ok: false,
      error: "Não foi possível concluir o onboarding. Tente novamente.",
    };
  }

  revalidatePath("/inicio");
  revalidatePath("/onboarding");
  revalidatePath("/clientes");
  revalidatePath("/visitas/nova");
  redirect("/inicio?bemvindo=1");
}

export type SkipOnboardingDetailsResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Conclui o onboarding sem criar cliente/estabelecimento — apenas grava o contexto de trabalho.
 * O utilizador pode completar dados em Clientes depois.
 */
export async function skipOnboardingDetailsAction(
  _prev: SkipOnboardingDetailsResult | undefined,
  formData: FormData,
): Promise<SkipOnboardingDetailsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed_at) {
    redirect("/inicio");
  }

  const work_context = parseWorkContext(formData.get("work_context"));
  if (!work_context) {
    return {
      ok: false,
      error:
        "Selecione como trabalha (institucional, clínico ou ambos) antes de continuar.",
    };
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      work_context,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (profErr) {
    return {
      ok: false,
      error: "Não foi possível concluir o onboarding. Tente novamente.",
    };
  }

  revalidatePath("/inicio");
  revalidatePath("/onboarding");
  revalidatePath("/clientes");
  revalidatePath("/visitas/nova");
  redirect("/inicio?bemvindo=1&onboarding=minimal");
}
