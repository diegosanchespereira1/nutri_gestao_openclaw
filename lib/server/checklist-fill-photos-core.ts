import "server-only";

import { revalidatePath } from "next/cache";

import { requireWorkspaceAuthContext } from "@/lib/actions/auth-context";
import {
  CHECKLIST_FILL_PHOTO_MAX_BYTES,
  CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC,
  CHECKLIST_FILL_PHOTOS_BUCKET,
  CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM,
} from "@/lib/constants/checklist-fill-photos-storage";
import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "@/lib/images/image-mime";
import { logBudgetEvent } from "@/lib/observability/request-budget";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import { sanitizeStorageFilename } from "@/lib/utils/storage-filename";

export type ChecklistFillPhotoUploadResult =
  | { ok: true; photo: ChecklistFillPhotoView }
  | { ok: false; error: string };

async function sessionDossierIsApproved(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("checklist_fill_sessions")
    .select("dossier_approved_at")
    .eq("id", sessionId)
    .maybeSingle();
  return Boolean(data?.dossier_approved_at);
}

async function revalidateAfterPhotoChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<void> {
  const { data: meta } = await supabase
    .from("checklist_fill_sessions")
    .select("scheduled_visit_id")
    .eq("id", sessionId)
    .maybeSingle();

  const vid = meta?.scheduled_visit_id;
  if (vid) {
    const id = String(vid);
    revalidatePath(`/visitas/${id}`);
    revalidatePath(`/visitas/${id}/iniciar`);
  }
}

async function verifyGlobalItemInSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string,
  itemId: string,
): Promise<boolean> {
  const { data: itemMeta } = await supabase
    .from("checklist_template_items")
    .select("id, section_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!itemMeta) return false;
  const { data: sec } = await supabase
    .from("checklist_template_sections")
    .select("template_id")
    .eq("id", itemMeta.section_id as string)
    .maybeSingle();
  return Boolean(sec && sec.template_id === templateId);
}

async function verifyCustomItemInSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customTemplateId: string,
  itemId: string,
): Promise<boolean> {
  const { data: itemMeta } = await supabase
    .from("checklist_custom_items")
    .select("id, custom_section_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!itemMeta) return false;
  const { data: sec } = await supabase
    .from("checklist_custom_sections")
    .select("custom_template_id")
    .eq("id", itemMeta.custom_section_id as string)
    .maybeSingle();
  return Boolean(sec && sec.custom_template_id === customTemplateId);
}

async function verifyWorkspaceItemInSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceTemplateId: string,
  itemId: string,
): Promise<boolean> {
  const { data: itemMeta } = await supabase
    .from("checklist_workspace_items")
    .select("id, workspace_section_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!itemMeta) return false;
  const { data: sec } = await supabase
    .from("checklist_workspace_sections")
    .select("workspace_template_id")
    .eq("id", itemMeta.workspace_section_id as string)
    .maybeSingle();
  return Boolean(sec && sec.workspace_template_id === workspaceTemplateId);
}

async function assertSessionItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  sessionId: string,
  itemId: string,
  itemResponseSource: "global" | "custom" | "workspace",
): Promise<
  | {
      ok: true;
      templateId: string | null;
      customTemplateId: string | null;
      workspaceTemplateId: string | null;
    }
  | { ok: false }
> {
  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select(
      "id, template_id, custom_template_id, workspace_template_id, establishment_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false };

  const establishmentId = sess.establishment_id as string | null;
  if (!establishmentId) return { ok: false };

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est?.client_id) return { ok: false };

  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id)
    .maybeSingle();
  if (!cl || cl.owner_user_id !== workspaceOwnerId) return { ok: false };

  if (itemResponseSource === "global") {
    const tid = sess.template_id as string | null;
    if (!tid) return { ok: false };
    const allowed = await verifyGlobalItemInSession(supabase, tid, itemId);
    if (!allowed) return { ok: false };
    return {
      ok: true,
      templateId: tid,
      customTemplateId: null,
      workspaceTemplateId: null,
    };
  }

  if (itemResponseSource === "custom") {
    const cid = sess.custom_template_id as string | null;
    if (!cid) return { ok: false };
    const allowed = await verifyCustomItemInSession(supabase, cid, itemId);
    if (!allowed) return { ok: false };
    return {
      ok: true,
      templateId: null,
      customTemplateId: cid,
      workspaceTemplateId: null,
    };
  }

  const wid = sess.workspace_template_id as string | null;
  if (!wid) return { ok: false };
  const allowed = await verifyWorkspaceItemInSession(supabase, wid, itemId);
  if (!allowed) return { ok: false };
  return {
    ok: true,
    templateId: null,
    customTemplateId: null,
    workspaceTemplateId: wid,
  };
}

function parseOptionalCoord(raw: string | null): number | null {
  if (raw === null || raw === undefined) return null;
  const t = String(raw).trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

async function signPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CHECKLIST_FILL_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function loadSessionItemPhotosWithUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<Record<string, ChecklistFillPhotoView[]>> {
  const { data: rows } = await supabase
    .from("checklist_fill_item_photos")
    .select(
      "id, template_item_id, custom_item_id, workspace_item_id, storage_path, taken_at, latitude, longitude",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const out: Record<string, ChecklistFillPhotoView[]> = {};
  const typedRows = (rows ?? []) as Array<{
    id: string;
    template_item_id: string | null;
    custom_item_id: string | null;
    workspace_item_id: string | null;
    storage_path: string;
    taken_at: string;
    latitude: number | null;
    longitude: number | null;
  }>;

  const uniquePaths = Array.from(new Set(typedRows.map((r) => r.storage_path)));
  const signedMap = new Map<string, string>();
  if (uniquePaths.length > 0) {
    const { data: signedRows, error } = await supabase.storage
      .from(CHECKLIST_FILL_PHOTOS_BUCKET)
      .createSignedUrls(uniquePaths, CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC);
    logBudgetEvent({
      service: "storage",
      endpoint: "/storage/v1/object/sign",
      source: "loadSessionItemPhotosWithUrls",
      count: uniquePaths.length,
    });
    if (!error) {
      signedRows?.forEach((entry, idx) => {
        const path = uniquePaths[idx];
        if (path && entry?.signedUrl) signedMap.set(path, entry.signedUrl);
      });
    }
  }

  for (const r of typedRows) {
    const itemKey = r.template_item_id ?? r.custom_item_id ?? r.workspace_item_id;
    if (!itemKey) continue;
    const url = signedMap.get(r.storage_path);
    if (!url) continue;

    const view: ChecklistFillPhotoView = {
      id: r.id,
      itemId: itemKey,
      url,
      takenAt: r.taken_at,
      hasLocation:
        r.latitude != null &&
        r.longitude != null &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude),
    };

    const list = out[itemKey] ?? [];
    list.push(view);
    out[itemKey] = list;
  }

  return out;
}

/** Upload multipart (mesmos campos que o antigo Server Action). Usado pela rota HTTP para evitar IDs de action em Docker/deploy. */
export async function runUploadChecklistFillPhoto(
  formData: FormData,
): Promise<ChecklistFillPhotoUploadResult> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const sourceRaw = String(formData.get("item_response_source") ?? "").trim();
  const itemResponseSource: "global" | "custom" | "workspace" =
    sourceRaw === "custom"
      ? "custom"
      : sourceRaw === "workspace"
        ? "workspace"
        : "global";

  const file = formData.get("file");
  if (!sessionId || !itemId || !(file instanceof File)) {
    return { ok: false, error: "Dados em falta." };
  }

  if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) {
    return { ok: false, error: "A imagem é demasiado grande (máx. 6 MB)." };
  }

  // Normaliza MIME (aceita variantes como "image/jpg" e MIME vazio via extensão).
  const mime = normalizeImageMime(file.type, file.name);
  if (!mime) {
    return {
      ok: false,
      error: "Formato não suportado. Use JPEG (.jpg), PNG ou WebP.",
    };
  }

  const ext = extensionForCanonicalImageMime(mime);

  const sessionOk = await assertSessionItem(
    supabase,
    auth.workspaceOwnerId,
    sessionId,
    itemId,
    itemResponseSource,
  );
  if (!sessionOk.ok) {
    return { ok: false, error: "Item inválido para esta sessão." };
  }

  if (await sessionDossierIsApproved(supabase, sessionId)) {
    return {
      ok: false,
      error: "Dossiê aprovado: não é possível adicionar fotos.",
    };
  }

  let countQuery = supabase
    .from("checklist_fill_item_photos")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (itemResponseSource === "global") {
    countQuery = countQuery
      .eq("template_item_id", itemId)
      .is("custom_item_id", null)
      .is("workspace_item_id", null);
  } else if (itemResponseSource === "custom") {
    countQuery = countQuery
      .eq("custom_item_id", itemId)
      .is("template_item_id", null)
      .is("workspace_item_id", null);
  } else {
    countQuery = countQuery
      .eq("workspace_item_id", itemId)
      .is("template_item_id", null)
      .is("custom_item_id", null);
  }

  const { count } = await countQuery;

  if ((count ?? 0) >= CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM) {
    return {
      ok: false,
      error: `Limite de ${CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM} fotos por item.`,
    };
  }

  const photoId = crypto.randomUUID();
  const safeName = sanitizeStorageFilename(file.name);
  const objectName = `${photoId}.${ext}`;
  const storagePath = `${auth.workspaceOwnerId}/${sessionId}/${objectName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(CHECKLIST_FILL_PHOTOS_BUCKET)
    .upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
    });
  logBudgetEvent({
    service: "storage",
    endpoint: "/storage/v1/object/upload",
    source: "runUploadChecklistFillPhoto",
    userId: auth.userId,
  });

  if (upErr) {
    return {
      ok: false,
      error:
        "Não foi possível enviar a foto. Verifique a ligação à rede e tente novamente.",
    };
  }

  const lat = parseOptionalCoord(String(formData.get("latitude") ?? ""));
  const lng = parseOptionalCoord(String(formData.get("longitude") ?? ""));

  const insertRow = {
    user_id: auth.userId,
    session_id: sessionId,
    template_item_id: itemResponseSource === "global" ? itemId : null,
    custom_item_id: itemResponseSource === "custom" ? itemId : null,
    workspace_item_id: itemResponseSource === "workspace" ? itemId : null,
    storage_path: storagePath,
    original_filename: safeName,
    content_type: mime,
    file_size: file.size,
    taken_at: new Date().toISOString(),
    latitude: lat,
    longitude: lng,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("checklist_fill_item_photos")
    .insert(insertRow)
    .select("id, taken_at, latitude, longitude")
    .single();
  logBudgetEvent({
    service: "database",
    endpoint: "public.checklist_fill_item_photos.insert",
    source: "runUploadChecklistFillPhoto",
    userId: auth.userId,
  });

  if (insErr || !inserted) {
    await supabase.storage.from(CHECKLIST_FILL_PHOTOS_BUCKET).remove([storagePath]);
    return { ok: false, error: "Não foi possível salvar o registro da foto." };
  }

  const url = await signPhotoUrl(supabase, storagePath);
  if (!url) {
    return { ok: false, error: "Foto enviada mas URL temporária indisponível." };
  }

  await revalidateAfterPhotoChange(supabase, sessionId);

  const view: ChecklistFillPhotoView = {
    id: inserted.id as string,
    itemId,
    url,
    takenAt: String(inserted.taken_at),
    hasLocation:
      inserted.latitude != null &&
      inserted.longitude != null &&
      Number.isFinite(inserted.latitude as number) &&
      Number.isFinite(inserted.longitude as number),
  };

  return { ok: true, photo: view };
}

export async function runDeleteChecklistFillPhoto(input: {
  photoId: string;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { photoId, sessionId } = input;

  const { data: row } = await supabase
    .from("checklist_fill_item_photos")
    .select("id, storage_path, session_id")
    .eq("id", photoId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Foto não encontrada." };

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("establishment_id")
    .eq("id", sessionId)
    .maybeSingle();

  const establishmentId = sess?.establishment_id as string | null;
  if (!establishmentId) {
    return { ok: false, error: "Sem permissão." };
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est?.client_id) {
    return { ok: false, error: "Sem permissão." };
  }

  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id)
    .maybeSingle();

  if (!cl || cl.owner_user_id !== auth.workspaceOwnerId) {
    return { ok: false, error: "Sem permissão." };
  }

  if (await sessionDossierIsApproved(supabase, sessionId)) {
    return {
      ok: false,
      error: "Dossiê aprovado: não é possível remover fotos.",
    };
  }

  const path = row.storage_path as string;
  await supabase.storage.from(CHECKLIST_FILL_PHOTOS_BUCKET).remove([path]);
  await supabase.from("checklist_fill_item_photos").delete().eq("id", photoId);

  await revalidateAfterPhotoChange(supabase, sessionId);
  return { ok: true };
}
