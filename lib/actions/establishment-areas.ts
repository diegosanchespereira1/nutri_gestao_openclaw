"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type {
  EstablishmentAreaOption,
  EstablishmentAreaRow,
} from "@/lib/types/establishment-areas";

export type AreaActionResult =
  | { ok: true }
  | { ok: false; error: string };

/* ─── helper: valida que o estabelecimento pertence ao usuário ────────────── */

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  establishmentId: string,
): Promise<{ clientId: string } | null> {
  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) return null;

  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id)
    .maybeSingle();

  if (!cl || cl.owner_user_id !== workspaceOwnerId) return null;
  return { clientId: est.client_id as string };
}

/* ─── helper: valida que a área pertence ao usuário ──────────────────────── */

async function assertAreaOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  areaId: string,
): Promise<{ establishmentId: string; clientId: string } | null> {
  const { data: area } = await supabase
    .from("establishment_areas")
    .select("establishment_id, owner_user_id")
    .eq("id", areaId)
    .maybeSingle();

  if (!area || area.owner_user_id !== userId) return null;

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", area.establishment_id)
    .maybeSingle();

  if (!est) return null;
  return { establishmentId: area.establishment_id as string, clientId: est.client_id as string };
}

function revalidateClientPaths(clientId: string) {
  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath(`/clientes/${clientId}/checklists`);
  revalidatePath("/checklists");
}

/* ─── loadAreasForEstablishment ──────────────────────────────────────────── */

export async function loadAreasForEstablishment(
  establishmentId: string,
): Promise<EstablishmentAreaOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!owned) return [];

  const { data } = await supabase
    .from("establishment_areas")
    .select("id, name, description, position")
    .eq("establishment_id", establishmentId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: (r.description as string | null) ?? null,
    position: r.position,
  }));
}

/* ─── createAreaAction ───────────────────────────────────────────────────── */

export async function createAreaAction(
  establishmentId: string,
  name: string,
  description?: string | null,
): Promise<AreaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const nameTrim = name.trim();
  if (!nameTrim) return { ok: false, error: "O nome da área é obrigatório." };
  if (nameTrim.length > 120) return { ok: false, error: "Nome muito longo (máx. 120 caracteres)." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!owned) return { ok: false, error: "Estabelecimento não encontrado." };

  // Posição = último + 1
  const { count } = await supabase
    .from("establishment_areas")
    .select("id", { count: "exact", head: true })
    .eq("establishment_id", establishmentId);

  const { error } = await supabase.from("establishment_areas").insert({
    establishment_id: establishmentId,
    owner_user_id: workspaceOwnerId,
    name: nameTrim,
    description: description?.trim() || null,
    position: count ?? 0,
  });

  if (error) return { ok: false, error: "Não foi possível criar a área." };

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}

/* ─── updateAreaAction ───────────────────────────────────────────────────── */

export async function updateAreaAction(
  areaId: string,
  name: string,
  description?: string | null,
): Promise<AreaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const nameTrim = name.trim();
  if (!nameTrim) return { ok: false, error: "O nome da área é obrigatório." };
  if (nameTrim.length > 120) return { ok: false, error: "Nome muito longo (máx. 120 caracteres)." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertAreaOwned(supabase, workspaceOwnerId, areaId);
  if (!owned) return { ok: false, error: "Área não encontrada." };

  const { error } = await supabase
    .from("establishment_areas")
    .update({ name: nameTrim, description: description?.trim() || null })
    .eq("id", areaId);

  if (error) return { ok: false, error: "Não foi possível atualizar a área." };

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}

/* ─── deleteAreaAction ───────────────────────────────────────────────────── */

export async function deleteAreaAction(areaId: string): Promise<AreaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertAreaOwned(supabase, workspaceOwnerId, areaId);
  if (!owned) return { ok: false, error: "Área não encontrada." };

  const { error } = await supabase
    .from("establishment_areas")
    .delete()
    .eq("id", areaId);

  if (error) return { ok: false, error: "Não foi possível remover a área." };

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}

/* ─── reorderAreasAction ─────────────────────────────────────────────────── */

/**
 * Recebe a lista ordenada de IDs e atualiza a coluna `position` de cada área.
 * Valida que todas as áreas pertencem ao mesmo estabelecimento e ao usuário.
 */
export async function reorderAreasAction(
  establishmentId: string,
  orderedAreaIds: string[],
): Promise<AreaActionResult> {
  if (orderedAreaIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!owned) return { ok: false, error: "Estabelecimento não encontrado." };

  // Atualizar posições em paralelo
  const updates = orderedAreaIds.map((id, index) =>
    supabase
      .from("establishment_areas")
      .update({ position: index })
      .eq("id", id)
      .eq("establishment_id", establishmentId)
      .eq("owner_user_id", workspaceOwnerId),
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);
  if (hasError) return { ok: false, error: "Não foi possível reordenar as áreas." };

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}

/* ─── getAreaById ────────────────────────────────────────────────────────── */

export async function getAreaById(areaId: string): Promise<EstablishmentAreaRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("establishment_areas")
    .select("*")
    .eq("id", areaId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  return data as EstablishmentAreaRow | null;
}
