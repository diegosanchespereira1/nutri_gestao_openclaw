"use server";

import { revalidatePath } from "next/cache";

import {
  CHECKLIST_FILL_PHOTO_MAX_BYTES,
  CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC,
  CHECKLIST_FILL_PHOTOS_BUCKET,
  CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM,
  extensionForImageMime,
  isAllowedChecklistPhotoContentType,
} from "@/lib/constants/checklist-fill-photos-storage";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import { sanitizeStorageFilename } from "@/lib/utils/storage-filename";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

type FillActionResult =
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
  revalidatePath(`/checklists/preencher/${sessionId}`);

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

async function assertSessionItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  sessionId: string,
  itemId: string,
  itemResponseSource: "global" | "custom",
): Promise<
  | { ok: true; templateId: string | null; customTemplateId: string | null }
  | { ok: false }
> {
  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, template_id, custom_template_id, establishment_id")
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
    };
  }

  const cid = sess.custom_template_id as string | null;
  if (!cid) return { ok: false };
  const allowed = await verifyCustomItemInSession(supabase, cid, itemId);
  if (!allowed) return { ok: false };
  return {
    ok: true,
    templateId: null,
    customTemplateId: cid,
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
      "id, template_item_id, custom_item_id, storage_path, taken_at, latitude, longitude",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const out: Record<string, ChecklistFillPhotoView[]> = {};

  for (const raw of rows ?? []) {
    const r = raw as {
      id: string;
      template_item_id: string | null;
      custom_item_id: string | null;
      storage_path: string;
      taken_at: string;
      latitude: number | null;
      longitude: number | null;
    };
    const itemKey = r.template_item_id ?? r.custom_item_id;
    if (!itemKey) continue;

    const url = await signPhotoUrl(supabase, r.storage_path);
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

export async function uploadChecklistFillPhotoAction(
  formData: FormData,
): Promise<FillActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const sourceRaw = String(formData.get("item_response_source") ?? "").trim();
  const itemResponseSource =
    sourceRaw === "custom" ? ("custom" as const) : ("global" as const);

  const file = formData.get("file");
  if (!sessionId || !itemId || !(file instanceof File)) {
    return { ok: false, error: "Dados em falta." };
  }

  if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) {
    return { ok: false, error: "A imagem é demasiado grande (máx. 6 MB)." };
  }

  const mime = file.type || "application/octet-stream";
  if (!isAllowedChecklistPhotoContentType(mime)) {
    return {
      ok: false,
      error: "Formato não suportado. Use JPEG, PNG ou WebP.",
    };
  }

  const ext = extensionForImageMime(mime);
  if (!ext) return { ok: false, error: "Formato inválido." };

  const sessionOk = await assertSessionItem(
    supabase,
    workspaceOwnerId,
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
    countQuery = countQuery.eq("template_item_id", itemId).is("custom_item_id", null);
  } else {
    countQuery = countQuery.eq("custom_item_id", itemId).is("template_item_id", null);
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
  // Pasta do bucket = titular do workspace (RLS em storage.objects), não auth.uid() —
  // senão membros da equipe falham no upload.
  const storagePath = `${workspaceOwnerId}/${sessionId}/${objectName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(CHECKLIST_FILL_PHOTOS_BUCKET)
    .upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
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
    user_id: user.id,
    session_id: sessionId,
    template_item_id: itemResponseSource === "global" ? itemId : null,
    custom_item_id: itemResponseSource === "custom" ? itemId : null,
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

export async function deleteChecklistFillPhotoAction(input: {
  photoId: string;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

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

  if (!cl || cl.owner_user_id !== workspaceOwnerId) {
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
