"use server";

import { revalidatePath } from "next/cache";

import {
  categoryFromType,
  ESTABLISHMENT_CATEGORIES,
  isBuiltinEstablishmentType,
  slugifyEstablishmentCustomTypeLabel,
} from "@/lib/constants/establishment-types";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentCategory } from "@/lib/types/establishments";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type EstablishmentCustomType = {
  id: string;
  label: string;
  slug: string;
  category: EstablishmentCategory;
};

function parseCategory(raw: unknown): EstablishmentCategory | null {
  if (typeof raw !== "string") return null;
  return (ESTABLISHMENT_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as EstablishmentCategory)
    : null;
}

function revalidateEstablishmentTypePaths() {
  revalidatePath("/clientes");
  revalidatePath("/definicoes/tipos-estabelecimento");
  revalidatePath("/definicoes");
}

export async function loadEstablishmentCustomTypesAction(
  category?: EstablishmentCategory,
): Promise<EstablishmentCustomType[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  let query = supabase
    .from("establishment_custom_types")
    .select("id, label, slug, category")
    .eq("owner_user_id", workspaceOwnerId)
    .order("label", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return (data ?? []) as EstablishmentCustomType[];
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug;
  for (let i = 0; i < 8; i += 1) {
    if (isBuiltinEstablishmentType(candidate)) {
      candidate = `${baseSlug}_${i + 1}`;
      continue;
    }
    const { data } = await supabase
      .from("establishment_custom_types")
      .select("id")
      .eq("owner_user_id", workspaceOwnerId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}_${i + 1}`;
  }
  return `${baseSlug}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function createEstablishmentCustomTypeAction(input: {
  label: string;
  category: EstablishmentCategory;
}): Promise<
  | { ok: true; type: EstablishmentCustomType }
  | { ok: false; error: string }
> {
  const trimmed = input.label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome do tipo não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return {
      ok: false,
      error: "O nome do tipo deve ter no máximo 80 caracteres.",
    };
  }

  const category = parseCategory(input.category);
  if (!category) {
    return { ok: false, error: "Selecione uma categoria válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existingByLabel } = await supabase
    .from("establishment_custom_types")
    .select("id, label, slug, category")
    .eq("owner_user_id", workspaceOwnerId)
    .ilike("label", trimmed)
    .maybeSingle();

  if (existingByLabel) {
    return {
      ok: true,
      type: existingByLabel as EstablishmentCustomType,
    };
  }

  const baseSlug = slugifyEstablishmentCustomTypeLabel(trimmed);
  const slug = await ensureUniqueSlug(supabase, workspaceOwnerId, baseSlug);

  const { data, error } = await supabase
    .from("establishment_custom_types")
    .insert({
      owner_user_id: workspaceOwnerId,
      category,
      label: trimmed,
      slug,
    })
    .select("id, label, slug, category")
    .single();

  if (error || !data) {
    console.error("[createEstablishmentCustomTypeAction]", error?.message);
    return { ok: false, error: "Erro ao criar tipo. Tente novamente." };
  }

  revalidateEstablishmentTypePaths();
  return { ok: true, type: data as EstablishmentCustomType };
}

export async function updateEstablishmentCustomTypeAction(input: {
  id: string;
  label: string;
}): Promise<
  | { ok: true; type: EstablishmentCustomType }
  | { ok: false; error: string }
> {
  const trimmed = input.label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome do tipo não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return {
      ok: false,
      error: "O nome do tipo deve ter no máximo 80 caracteres.",
    };
  }

  const id = input.id.trim();
  if (!id) return { ok: false, error: "Tipo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("establishment_custom_types")
    .update({ label: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .select("id, label, slug, category")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "Já existe um tipo com este nome." };
    }
    return { ok: false, error: "Erro ao guardar tipo. Tente novamente." };
  }

  revalidateEstablishmentTypePaths();
  return { ok: true, type: data as EstablishmentCustomType };
}

export async function deleteEstablishmentCustomTypeAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const typeId = id.trim();
  if (!typeId) return { ok: false, error: "Tipo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: row, error: loadErr } = await supabase
    .from("establishment_custom_types")
    .select("id, slug")
    .eq("id", typeId)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, error: "Tipo não encontrado." };
  }

  const { count, error: countErr } = await supabase
    .from("establishments")
    .select("id", { count: "exact", head: true })
    .eq("establishment_type", row.slug);

  if (countErr) {
    return { ok: false, error: "Não foi possível verificar o uso do tipo." };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este tipo está em uso por um ou mais estabelecimentos. Altere o tipo neles antes de eliminar.",
    };
  }

  const { error } = await supabase
    .from("establishment_custom_types")
    .delete()
    .eq("id", typeId)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    return { ok: false, error: "Erro ao eliminar tipo. Tente novamente." };
  }

  revalidateEstablishmentTypePaths();
  return { ok: true };
}

/**
 * Resolve slug built-in ou custom do workspace.
 * Retorna null se inválido / não pertence ao tenant.
 */
export async function resolveWorkspaceEstablishmentType(
  raw: unknown,
  workspaceOwnerId: string,
): Promise<{ slug: string; category: EstablishmentCategory } | null> {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  if (isBuiltinEstablishmentType(value)) {
    const cat = categoryFromType(value);
    if (!cat) return null;
    return { slug: value, category: cat };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("establishment_custom_types")
    .select("slug, category")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("slug", value)
    .maybeSingle();

  if (!data) return null;
  const category = parseCategory(data.category);
  if (!category) return null;
  return { slug: data.slug as string, category };
}
