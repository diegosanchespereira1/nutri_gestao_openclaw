"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canManageTenantFully,
  getWorkspaceAccountOwnerId,
} from "@/lib/workspace";
import {
  DEFAULT_PDF_SETTINGS,
  type ChecklistPdfSettings,
} from "@/lib/constants/checklist-pdf-settings";

export type { ChecklistPdfSettings } from "@/lib/constants/checklist-pdf-settings";

const APP_METADATA_KEY = "checklist_client_signature_required";

/** Valida e normaliza um hex (#RRGGBB). Retorna o fallback se inválido. */
function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(v)) return v;
  return fallback;
}

function errorText(error: unknown): string {
  return `${(error as { message?: string })?.message ?? ""} ${JSON.stringify(error)}`.toLowerCase();
}

function isMissingClientSignatureRequiredColumn(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes("client_signature_required") &&
    (text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("pgrst204") ||
      text.includes("42703") ||
      (text.includes("column") && text.includes("does not exist")))
  );
}

function isMissingClientSignatureRpc(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes("set_checklist_client_signature_required") &&
    (text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("pgrst202") ||
      (text.includes("function") && text.includes("does not exist")))
  );
}

function readAppMetadataFlag(metadata: Record<string, unknown> | undefined): boolean | null {
  const value = metadata?.[APP_METADATA_KEY];
  return typeof value === "boolean" ? value : null;
}

async function readClientSignatureRequiredFromAppMetadata(
  workspaceOwnerId: string,
): Promise<boolean | null> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service.auth.admin.getUserById(workspaceOwnerId);
    if (error || !data.user) return null;
    return readAppMetadataFlag(data.user.app_metadata as Record<string, unknown> | undefined);
  } catch {
    return null;
  }
}

async function writeClientSignatureRequiredToAppMetadata(
  workspaceOwnerId: string,
  required: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const service = createServiceRoleClient();
    const { data, error: readError } = await service.auth.admin.getUserById(workspaceOwnerId);
    if (readError || !data.user) {
      return { ok: false, error: "Não foi possível ler o titular da conta para salvar a preferência." };
    }

    const existing = (data.user.app_metadata ?? {}) as Record<string, unknown>;
    const { error: writeError } = await service.auth.admin.updateUserById(workspaceOwnerId, {
      app_metadata: {
        ...existing,
        [APP_METADATA_KEY]: required,
      },
    });

    if (writeError) return { ok: false, error: writeError.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao salvar preferência de assinatura.";
    return { ok: false, error: message };
  }
}

async function persistClientSignatureRequired(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  required: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: rpcError } = await supabase.rpc("set_checklist_client_signature_required", {
    p_required: required,
  });

  if (!rpcError) return { ok: true };

  if (isMissingClientSignatureRpc(rpcError)) {
    const { error: patchError } = await supabase
      .from("checklist_pdf_settings")
      .update({ client_signature_required: required })
      .eq("workspace_owner_id", workspaceOwnerId);

    if (!patchError) return { ok: true };

    if (isMissingClientSignatureRequiredColumn(patchError)) {
      const metaResult = await writeClientSignatureRequiredToAppMetadata(workspaceOwnerId, required);
      if (metaResult.ok) return { ok: true };

      return {
        ok: false,
        error:
          "PostgREST ainda não recarregou o schema e não foi possível salvar via Auth API. " +
          "Defina SUPABASE_SERVICE_ROLE_KEY no servidor ou execute NOTIFY pgrst, 'reload schema'; " +
          "no SQL Editor e reinicie o container rest se necessário.",
      };
    }

    return { ok: false, error: patchError.message };
  }

  return { ok: false, error: rpcError.message };
}

async function resolveClientSignatureRequired(
  workspaceOwnerId: string,
  rowValue: unknown,
): Promise<boolean> {
  if (typeof rowValue === "boolean") return rowValue;

  const fromMetadata = await readClientSignatureRequiredFromAppMetadata(workspaceOwnerId);
  if (fromMetadata !== null) return fromMetadata;

  return DEFAULT_PDF_SETTINGS.clientSignatureRequired;
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

    const clientSignatureRequired = await resolveClientSignatureRequired(
      workspaceOwnerId,
      undefined,
    );

    if (!fallback.data) {
      return { ...DEFAULT_PDF_SETTINGS, clientSignatureRequired };
    }

    return {
      headerBgColor: sanitizeHex(fallback.data.header_bg_color, DEFAULT_PDF_SETTINGS.headerBgColor),
      headerTextColor: sanitizeHex(fallback.data.header_text_color, DEFAULT_PDF_SETTINGS.headerTextColor),
      accentColor: sanitizeHex(fallback.data.accent_color, DEFAULT_PDF_SETTINGS.accentColor),
      clientSignatureRequired,
    };
  }

  if (!data) {
    const clientSignatureRequired = await resolveClientSignatureRequired(
      workspaceOwnerId,
      undefined,
    );
    return { ...DEFAULT_PDF_SETTINGS, clientSignatureRequired };
  }

  return {
    headerBgColor:   sanitizeHex(data.header_bg_color,   DEFAULT_PDF_SETTINGS.headerBgColor),
    headerTextColor: sanitizeHex(data.header_text_color, DEFAULT_PDF_SETTINGS.headerTextColor),
    accentColor:     sanitizeHex(data.accent_color,      DEFAULT_PDF_SETTINGS.accentColor),
    clientSignatureRequired: await resolveClientSignatureRequired(
      workspaceOwnerId,
      data.client_signature_required,
    ),
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

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await canManageTenantFully(supabase, user.id, workspaceOwnerId);
  if (!allowed) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta ou um membro com cargo Gestão podem alterar as configurações do PDF.",
    };
  }

  const headerBgColor   = sanitizeHex(formData.get("header_bg_color"),   DEFAULT_PDF_SETTINGS.headerBgColor);
  const headerTextColor = sanitizeHex(formData.get("header_text_color"), DEFAULT_PDF_SETTINGS.headerTextColor);
  const accentColor     = sanitizeHex(formData.get("accent_color"),      DEFAULT_PDF_SETTINGS.accentColor);
  const clientSignatureRequired = formData.get("client_signature_required") === "on";

  const colorPayload = {
    workspace_owner_id: workspaceOwnerId,
    header_bg_color: headerBgColor,
    header_text_color: headerTextColor,
    accent_color: accentColor,
    updated_at: new Date().toISOString(),
  };

  const { error: colorError } = await supabase
    .from("checklist_pdf_settings")
    .upsert(colorPayload, { onConflict: "workspace_owner_id" });

  if (colorError) return { ok: false, error: colorError.message };

  const sigResult = await persistClientSignatureRequired(
    supabase,
    workspaceOwnerId,
    clientSignatureRequired,
  );
  if (!sigResult.ok) return sigResult;

  revalidatePath("/definicoes/checklist-fotos");
  revalidatePath("/checklists/preencher", "layout");
  return { ok: true };
}
