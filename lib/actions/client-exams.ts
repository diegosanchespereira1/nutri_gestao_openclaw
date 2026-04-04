"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CLIENT_EXAMS_BUCKET } from "@/lib/constants/client-exams-storage";
import { createClient } from "@/lib/supabase/server";
import type { ClientExamCategory, ClientExamDocumentRow } from "@/lib/types/client-exams";
import { sanitizeStorageFilename } from "@/lib/utils/storage-filename";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_EXAM_BYTES = 15 * 1024 * 1024;

function isFile(v: unknown): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

export async function appendClientExamUploads(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  formData: FormData,
): Promise<string[]> {
  const errors: string[] = [];
  const groups: { category: ClientExamCategory; key: string }[] = [
    { category: "previous", key: "exam_previous" },
    { category: "scheduled", key: "exam_scheduled" },
  ];

  for (const { category, key } of groups) {
    const entries = formData.getAll(key);
    for (const entry of entries) {
      if (!isFile(entry) || entry.size === 0) continue;
      if (entry.size > MAX_EXAM_BYTES) {
        errors.push(
          `"${entry.name}" ultrapassa o limite de ${MAX_EXAM_BYTES / 1024 / 1024} MB.`,
        );
        continue;
      }
      const safe = sanitizeStorageFilename(entry.name);
      const path = `${userId}/${clientId}/${crypto.randomUUID()}_${safe}`;
      const body = new Uint8Array(await entry.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from(CLIENT_EXAMS_BUCKET)
        .upload(path, body, {
          contentType: entry.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) {
        errors.push(`Não foi possível carregar "${entry.name}".`);
        continue;
      }
      const { error: insErr } = await supabase.from("client_exam_documents").insert({
        client_id: clientId,
        category,
        storage_path: path,
        original_filename: entry.name,
        content_type: entry.type || null,
        file_size: entry.size,
      });
      if (insErr) {
        await supabase.storage.from(CLIENT_EXAMS_BUCKET).remove([path]);
        errors.push(`Erro ao registar "${entry.name}".`);
      }
    }
  }

  return errors;
}

export async function loadClientExamDocuments(
  clientId: string,
): Promise<ClientExamDocumentRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("client_exam_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as ClientExamDocumentRow[];
}

export async function deleteClientExamDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!id || !clientId) {
    return;
  }

  const { data: doc, error: selErr } = await supabase
    .from("client_exam_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (selErr || !doc) {
    revalidatePath(`/clientes/${clientId}/editar`);
    return;
  }

  await supabase.storage.from(CLIENT_EXAMS_BUCKET).remove([doc.storage_path]);
  await supabase.from("client_exam_documents").delete().eq("id", id);

  revalidatePath(`/clientes/${clientId}/editar`);
}
