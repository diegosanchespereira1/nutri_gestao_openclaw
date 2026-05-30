"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type ClientCustomSegment = {
  id: string;
  label: string;
};

export async function loadCustomSegmentsAction(): Promise<ClientCustomSegment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data } = await supabase
    .from("client_custom_segments")
    .select("id, label")
    .eq("owner_user_id", workspaceOwnerId)
    .order("label", { ascending: true });

  return (data ?? []) as ClientCustomSegment[];
}

export async function createCustomSegmentAction(
  label: string,
): Promise<{ ok: true; segment: ClientCustomSegment } | { ok: false; error: string }> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome da categoria não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "O nome da categoria deve ter no máximo 80 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existing } = await supabase
    .from("client_custom_segments")
    .select("id, label")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("label", trimmed)
    .maybeSingle();

  if (existing) {
    return { ok: true, segment: existing as ClientCustomSegment };
  }

  const { data, error } = await supabase
    .from("client_custom_segments")
    .insert({ label: trimmed, owner_user_id: workspaceOwnerId })
    .select("id, label")
    .single();

  if (error || !data) {
    return { ok: false, error: "Erro ao criar categoria. Tente novamente." };
  }

  revalidatePath("/clientes");
  return { ok: true, segment: data as ClientCustomSegment };
}

export async function upsertBuiltInSegmentOverrideAction(
  builtInKey: string,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome da categoria não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "O nome da categoria deve ter no máximo 80 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { error } = await supabase
    .from("client_custom_segments")
    .upsert(
      { owner_user_id: workspaceOwnerId, built_in_key: builtInKey, label: trimmed },
      { onConflict: "owner_user_id,built_in_key" },
    );

  if (error) {
    return { ok: false, error: "Erro ao guardar alteração. Tente novamente." };
  }

  revalidatePath("/clientes");
  revalidatePath("/definicoes/categorias");
  return { ok: true };
}

export async function updateCustomSegmentAction(
  id: string,
  label: string,
): Promise<{ ok: true; segment: ClientCustomSegment } | { ok: false; error: string }> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome da categoria não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "O nome da categoria deve ter no máximo 80 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("client_custom_segments")
    .update({ label: trimmed })
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .select("id, label")
    .single();

  if (error || !data) {
    return { ok: false, error: "Erro ao guardar categoria. Tente novamente." };
  }

  revalidatePath("/clientes");
  revalidatePath("/definicoes/categorias");
  return { ok: true, segment: data as ClientCustomSegment };
}

export async function deleteCustomSegmentAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { error } = await supabase
    .from("client_custom_segments")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    return { ok: false, error: "Erro ao eliminar categoria. Tente novamente." };
  }

  revalidatePath("/clientes");
  revalidatePath("/definicoes/categorias");
  return { ok: true };
}
