"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import {
  DEFAULT_PDF_SETTINGS,
  type ChecklistPdfSettings,
} from "@/lib/constants/checklist-pdf-settings";

export type { ChecklistPdfSettings } from "@/lib/constants/checklist-pdf-settings";

/** Valida e normaliza um hex (#RRGGBB). Retorna o fallback se inválido. */
function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(v)) return v;
  return fallback;
}

function isMissingClientSignatureRequiredColumn(error: unknown): boolean {
  const text = `${(error as { message?: string })?.message ?? ""} ${JSON.stringify(error)}`.toLowerCase();
  return (
    text.includes("client_signature_required") &&
    (text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("42703") ||
      (text.includes("column") && text.includes("does not exist")))
  );
}

/* ── Leitura ────────────────────────────────────────────────────────────── */

export async function getPdfSettingsAction(): Promise<ChecklistPdfSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_PDF_SETTINGS };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("checklist_pdf_settings")
    .select("header_bg_color, header_text_color, accent_color, client_signature_required")
    .eq("workspace_owner_id", workspaceOwnerId)
    .maybeSingle();

  if (error && isMissingClientSignatureRequiredColumn(error)) {
    const fallback = await supabase
      .from("checklist_pdf_settings")
      .select("header_bg_color, header_text_color, accent_color")
      .eq("workspace_owner_id", workspaceOwnerId)
      .maybeSingle();
    if (!fallback.data) return { ...DEFAULT_PDF_SETTINGS };
    return {
      headerBgColor: sanitizeHex(fallback.data.header_bg_color, DEFAULT_PDF_SETTINGS.headerBgColor),
      headerTextColor: sanitizeHex(fallback.data.header_text_color, DEFAULT_PDF_SETTINGS.headerTextColor),
      accentColor: sanitizeHex(fallback.data.accent_color, DEFAULT_PDF_SETTINGS.accentColor),
      clientSignatureRequired: DEFAULT_PDF_SETTINGS.clientSignatureRequired,
    };
  }

  if (!data) return { ...DEFAULT_PDF_SETTINGS };

  return {
    headerBgColor:   sanitizeHex(data.header_bg_color,   DEFAULT_PDF_SETTINGS.headerBgColor),
    headerTextColor: sanitizeHex(data.header_text_color, DEFAULT_PDF_SETTINGS.headerTextColor),
    accentColor:     sanitizeHex(data.accent_color,      DEFAULT_PDF_SETTINGS.accentColor),
    clientSignatureRequired:
      typeof data.client_signature_required === "boolean"
        ? data.client_signature_required
        : DEFAULT_PDF_SETTINGS.clientSignatureRequired,
  };
}

/** Lê apenas a flag de assinatura do cliente (para fluxo de preenchimento). */
export async function getClientSignatureRequiredAction(): Promise<boolean> {
  const settings = await getPdfSettingsAction();
  return settings.clientSignatureRequired;
}

/* ── Gravação ───────────────────────────────────────────────────────────── */

export type SavePdfSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function savePdfSettingsAction(
  _prevState: SavePdfSettingsResult | undefined,
  formData: FormData,
): Promise<SavePdfSettingsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Apenas o titular pode gravar (RLS garante, mas validamos aqui também)
  const { data: member } = await supabase
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", user.id)
    .maybeSingle();

  if (member?.owner_user_id) {
    return { ok: false, error: "Apenas o titular da conta pode alterar as configurações do PDF." };
  }

  const headerBgColor   = sanitizeHex(formData.get("header_bg_color"),   DEFAULT_PDF_SETTINGS.headerBgColor);
  const headerTextColor = sanitizeHex(formData.get("header_text_color"), DEFAULT_PDF_SETTINGS.headerTextColor);
  const accentColor     = sanitizeHex(formData.get("accent_color"),      DEFAULT_PDF_SETTINGS.accentColor);
  const clientSignatureRequired = formData.get("client_signature_required") === "on";

  const payload = {
    workspace_owner_id: user.id,
    header_bg_color: headerBgColor,
    header_text_color: headerTextColor,
    accent_color: accentColor,
    client_signature_required: clientSignatureRequired,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("checklist_pdf_settings")
    .upsert(payload, { onConflict: "workspace_owner_id" });

  if (error && isMissingClientSignatureRequiredColumn(error)) {
    const { client_signature_required: _omit, ...withoutSignatureFlag } = payload;
    const retry = await supabase
      .from("checklist_pdf_settings")
      .upsert(withoutSignatureFlag, { onConflict: "workspace_owner_id" });
    if (retry.error) return { ok: false, error: retry.error.message };
    return {
      ok: false,
      error:
        "As cores foram salvas, mas a opção de assinatura do cliente ainda não está disponível no banco. Aplique a migration 20260724100004_checklist_client_signature_required.sql.",
    };
  }

  if (error) return { ok: false, error: error.message };

  revalidatePath("/definicoes/checklist-fotos");
  revalidatePath("/checklists/preencher", "layout");
  return { ok: true };
}
