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

/* ── Leitura ────────────────────────────────────────────────────────────── */

export async function getPdfSettingsAction(): Promise<ChecklistPdfSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_PDF_SETTINGS };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data } = await supabase
    .from("checklist_pdf_settings")
    .select("header_bg_color, header_text_color, accent_color")
    .eq("workspace_owner_id", workspaceOwnerId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_PDF_SETTINGS };

  return {
    headerBgColor:   sanitizeHex(data.header_bg_color,   DEFAULT_PDF_SETTINGS.headerBgColor),
    headerTextColor: sanitizeHex(data.header_text_color, DEFAULT_PDF_SETTINGS.headerTextColor),
    accentColor:     sanitizeHex(data.accent_color,      DEFAULT_PDF_SETTINGS.accentColor),
  };
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

  const { error } = await supabase
    .from("checklist_pdf_settings")
    .upsert(
      {
        workspace_owner_id: user.id,
        header_bg_color:    headerBgColor,
        header_text_color:  headerTextColor,
        accent_color:       accentColor,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "workspace_owner_id" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/definicoes/checklist-fotos");
  return { ok: true };
}
