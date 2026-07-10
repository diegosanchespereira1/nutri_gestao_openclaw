"use server";

// Séries/turmas por cliente-escola (categoria "escola" em business_segment).
// Mesmo padrão de lib/actions/establishment-areas.ts, mas a chave é o
// cliente (client_id) em vez do estabelecimento — a série pertence ao
// cliente/escola, não a uma unidade física específica.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId, isTeamMember } from "@/lib/workspace";
import type { ClientSchoolGradeOption } from "@/lib/types/school-grades";

const OWNER_ONLY_ERROR =
  "Sem permissão. Apenas o titular da conta pode gerenciar séries.";

export type SchoolGradeActionResult = { ok: true } | { ok: false; error: string };

/* ─── helper: valida que o cliente pertence ao usuário (e é PJ) ──────────── */

async function assertClientOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id, kind")
    .eq("id", clientId)
    .maybeSingle();

  if (!cl || cl.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Cliente não encontrado." };
  }
  if (cl.kind !== "pj") {
    return { ok: false, error: "Séries só são permitidas para clientes pessoa jurídica." };
  }
  return { ok: true };
}

/* ─── helper: valida que a série pertence ao usuário, devolve o client_id ─── */

async function assertGradeOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  gradeId: string,
): Promise<{ clientId: string } | null> {
  const { data: grade } = await supabase
    .from("client_school_grades")
    .select("client_id")
    .eq("id", gradeId)
    .maybeSingle();
  if (!grade) return null;

  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", grade.client_id)
    .maybeSingle();

  if (!cl || cl.owner_user_id !== workspaceOwnerId) return null;
  return { clientId: grade.client_id as string };
}

function revalidateClientPaths(clientId: string) {
  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath("/pacientes");
}

/* ─── loadGradesForClient ─────────────────────────────────────────────────── */

export async function loadGradesForClient(
  clientId: string,
): Promise<ClientSchoolGradeOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!cl || cl.owner_user_id !== workspaceOwnerId) return [];

  const { data } = await supabase
    .from("client_school_grades")
    .select("id, name")
    .eq("client_id", clientId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
}

/** Séries de vários clientes de uma vez — usado no seletor de cliente do
 *  formulário do paciente (create sem cliente fixo) e no wizard de upload. */
export async function loadGradesForClients(
  clientIds: string[],
): Promise<Record<string, ClientSchoolGradeOption[]>> {
  if (clientIds.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, owner_user_id")
    .in("id", clientIds);

  const ownedIds = (clientRows ?? [])
    .filter((c) => c.owner_user_id === workspaceOwnerId)
    .map((c) => c.id as string);
  if (ownedIds.length === 0) return {};

  const { data } = await supabase
    .from("client_school_grades")
    .select("id, name, client_id")
    .in("client_id", ownedIds)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  const byClient: Record<string, ClientSchoolGradeOption[]> = {};
  for (const r of data ?? []) {
    const cid = r.client_id as string;
    if (!byClient[cid]) byClient[cid] = [];
    byClient[cid].push({ id: r.id as string, name: r.name as string });
  }
  return byClient;
}

/* ─── createGradeAction ──────────────────────────────────────────────────── */

export async function createGradeAction(
  clientId: string,
  name: string,
): Promise<SchoolGradeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const nameTrim = name.trim();
  if (!nameTrim) return { ok: false, error: "O nome da série é obrigatório." };
  if (nameTrim.length > 80) return { ok: false, error: "Nome muito longo (máx. 80 caracteres)." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (isTeamMember(user.id, workspaceOwnerId)) {
    return { ok: false, error: OWNER_ONLY_ERROR };
  }

  const owned = await assertClientOwned(supabase, workspaceOwnerId, clientId);
  if (!owned.ok) return owned;

  const { count } = await supabase
    .from("client_school_grades")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  const { error } = await supabase.from("client_school_grades").insert({
    client_id: clientId,
    name: nameTrim,
    position: count ?? 0,
  });

  if (error) {
    console.error("[school-grades:create] insert failed", {
      clientId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma série com esse nome nesta escola." };
    }
    return { ok: false, error: `Não foi possível criar a série. (${error.code ?? error.message})` };
  }

  revalidateClientPaths(clientId);
  return { ok: true };
}

/* ─── renameGradeAction ──────────────────────────────────────────────────── */

export async function renameGradeAction(
  gradeId: string,
  name: string,
): Promise<SchoolGradeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const nameTrim = name.trim();
  if (!nameTrim) return { ok: false, error: "O nome da série é obrigatório." };
  if (nameTrim.length > 80) return { ok: false, error: "Nome muito longo (máx. 80 caracteres)." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (isTeamMember(user.id, workspaceOwnerId)) {
    return { ok: false, error: OWNER_ONLY_ERROR };
  }

  const owned = await assertGradeOwned(supabase, workspaceOwnerId, gradeId);
  if (!owned) return { ok: false, error: "Série não encontrada." };

  const { error } = await supabase
    .from("client_school_grades")
    .update({ name: nameTrim })
    .eq("id", gradeId);

  if (error) {
    console.error("[school-grades:rename] update failed", {
      gradeId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma série com esse nome nesta escola." };
    }
    return { ok: false, error: `Não foi possível atualizar a série. (${error.code ?? error.message})` };
  }

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}

/* ─── deleteGradeAction ──────────────────────────────────────────────────── */

export async function deleteGradeAction(gradeId: string): Promise<SchoolGradeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (isTeamMember(user.id, workspaceOwnerId)) {
    return { ok: false, error: OWNER_ONLY_ERROR };
  }

  const owned = await assertGradeOwned(supabase, workspaceOwnerId, gradeId);
  if (!owned) return { ok: false, error: "Série não encontrada." };

  const { error } = await supabase.from("client_school_grades").delete().eq("id", gradeId);
  if (error) {
    console.error("[school-grades:delete] delete failed", {
      gradeId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, error: `Não foi possível remover a série. (${error.code ?? error.message})` };
  }

  revalidateClientPaths(owned.clientId);
  return { ok: true };
}
