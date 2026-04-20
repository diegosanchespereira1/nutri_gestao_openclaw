"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

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

  const { data } = await supabase
    .from("client_custom_segments")
    .select("id, label")
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

  const { data: existing } = await supabase
    .from("client_custom_segments")
    .select("id, label")
    .eq("label", trimmed)
    .maybeSingle();

  if (existing) {
    return { ok: true, segment: existing as ClientCustomSegment };
  }

  const { data, error } = await supabase
    .from("client_custom_segments")
    .insert({ label: trimmed, owner_user_id: user.id })
    .select("id, label")
    .single();

  if (error || !data) {
    return { ok: false, error: "Erro ao criar categoria. Tente novamente." };
  }

  revalidatePath("/clientes");
  return { ok: true, segment: data as ClientCustomSegment };
}
