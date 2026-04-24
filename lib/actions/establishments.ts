"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseEstablishmentType } from "@/lib/constants/establishment-types";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type {
  EstablishmentPickerOption,
  EstablishmentRow,
  EstablishmentWithClientNames,
} from "@/lib/types/establishments";

export type EstablishmentFormResult =
  | { ok: true }
  | { ok: false; error: string };

type EstablishmentClientJoin = EstablishmentWithClientNames["clients"];

type EstablishmentPickerDbRow = {
  id: string;
  name: string;
  state: string | null;
  establishment_type: EstablishmentRow["establishment_type"];
  clients: EstablishmentClientJoin | EstablishmentClientJoin[] | null;
};

function pickClientJoin(
  input: EstablishmentPickerDbRow["clients"],
): EstablishmentClientJoin | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
}

function mapRowToPickerOption(
  row: EstablishmentPickerDbRow,
): EstablishmentPickerOption | null {
  const client = pickClientJoin(row.clients);
  if (!client) return null;

  const uf = row.state?.toUpperCase() ?? "UF não definida";
  const clientLabel = client.trade_name?.trim() || client.legal_name;
  return {
    id: row.id,
    label: `${row.name} — ${clientLabel} (${uf} · ${establishmentTypeLabel[row.establishment_type]})`,
    state: row.state,
    establishment_type: row.establishment_type,
  };
}

function revalidateClientEstablishmentPaths(clientId: string, estId?: string) {
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath(`/clientes/${clientId}/estabelecimentos/novo`);
  if (estId) {
    revalidatePath(
      `/clientes/${clientId}/estabelecimentos/${estId}/editar`,
    );
  }
}

/** Todos os estabelecimentos do profissional (via clientes PJ próprios), para filtros globais. */
export async function loadEstablishmentsForOwner(): Promise<{
  rows: EstablishmentWithClientNames[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: clientRows, error: cErr } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("kind", "pj");

  if (cErr || !clientRows?.length) return { rows: [] };

  const clientIds = clientRows.map((c) => c.id as string);

  const { data, error } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as EstablishmentWithClientNames[] };
}

export async function searchOwnerEstablishmentsAction(params: {
  query: string;
  limit?: number;
}): Promise<{ rows: EstablishmentPickerOption[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const query = params.query.trim();
  if (query.length < 3) return { rows: [] };

  const limit = Math.min(15, Math.max(1, params.limit ?? 12));
  const q = `%${query}%`;

  const selectClause =
    "id, name, state, establishment_type, clients!inner(legal_name, trade_name, lifecycle_status, owner_user_id, kind)";

  const { data: byEstablishmentName, error: byEstErr } = await supabase
    .from("establishments")
    .select(selectClause)
    .eq("clients.owner_user_id", workspaceOwnerId)
    .eq("clients.kind", "pj")
    .ilike("name", q)
    .order("name", { ascending: true })
    .limit(limit);

  const { data: matchedClients, error: matchedClientsErr } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("kind", "pj")
    .or(`legal_name.ilike.${q},trade_name.ilike.${q}`)
    .limit(limit);

  let byClientNames: EstablishmentPickerDbRow[] = [];
  if (!matchedClientsErr && matchedClients && matchedClients.length > 0) {
    const clientIds = matchedClients.map((row) => row.id as string);
    const { data, error } = await supabase
      .from("establishments")
      .select(selectClause)
      .in("client_id", clientIds)
      .order("name", { ascending: true })
      .limit(limit);
    if (!error && data) {
      byClientNames = data as unknown as EstablishmentPickerDbRow[];
    }
  }

  if (byEstErr || matchedClientsErr) return { rows: [] };

  const merged = new Map<string, EstablishmentPickerOption>();
  for (const row of (byEstablishmentName ?? []) as unknown as EstablishmentPickerDbRow[]) {
    const mapped = mapRowToPickerOption(row);
    if (mapped) merged.set(mapped.id, mapped);
  }
  for (const row of byClientNames) {
    const mapped = mapRowToPickerOption(row);
    if (mapped) merged.set(mapped.id, mapped);
  }

  const rows = Array.from(merged.values())
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
    .slice(0, limit);

  return { rows };
}

export async function loadOwnerChecklistEstablishmentsDropdownAction(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: EstablishmentPickerOption[]; total: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [], total: 0 };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const limit = Math.min(120, Math.max(20, params?.limit ?? 80));
  const offset = Math.max(0, params?.offset ?? 0);

  const selectClause =
    "id, name, state, establishment_type, clients!inner(legal_name, trade_name, lifecycle_status, owner_user_id, kind)";

  const { data, error, count } = await supabase
    .from("establishments")
    .select(selectClause, { count: "exact" })
    .eq("clients.owner_user_id", workspaceOwnerId)
    .eq("clients.kind", "pj")
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data?.length) {
    return { rows: [], total: count ?? 0 };
  }

  const rows = (data as unknown as EstablishmentPickerDbRow[])
    .map(mapRowToPickerOption)
    .filter((row): row is EstablishmentPickerOption => Boolean(row));

  return { rows, total: count ?? rows.length };
}

export async function loadRecentChecklistEstablishmentsAction(
  limit = 3,
): Promise<{ rows: EstablishmentPickerOption[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const safeLimit = Math.min(10, Math.max(1, limit));

  const { data: recentRows, error: recentErr } = await supabase
    .from("checklist_establishment_recent")
    .select("establishment_id, last_opened_at")
    .order("last_opened_at", { ascending: false })
    .limit(safeLimit * 8);

  if (recentErr || !recentRows?.length) return { rows: [] };

  const seen = new Set<string>();
  const establishmentIds: string[] = [];
  for (const row of recentRows) {
    const eid = row.establishment_id as string;
    if (seen.has(eid)) continue;
    seen.add(eid);
    establishmentIds.push(eid);
    if (establishmentIds.length >= safeLimit) break;
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: establishments, error: estErr } = await supabase
    .from("establishments")
    .select(
      "id, name, state, establishment_type, clients!inner(legal_name, trade_name, lifecycle_status, owner_user_id, kind)",
    )
    .in("id", establishmentIds)
    .eq("clients.owner_user_id", workspaceOwnerId)
    .eq("clients.kind", "pj");

  if (estErr || !establishments?.length) return { rows: [] };

  const byId = new Map<string, EstablishmentPickerOption>();
  for (const row of establishments as unknown as EstablishmentPickerDbRow[]) {
    const mapped = mapRowToPickerOption(row);
    if (mapped) byId.set(mapped.id, mapped);
  }

  const rows = establishmentIds
    .map((id) => byId.get(id))
    .filter((row): row is EstablishmentPickerOption => Boolean(row))
    .slice(0, safeLimit);

  return { rows };
}

export async function registerChecklistEstablishmentOpenAction(
  establishmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const estId = establishmentId.trim();
  if (!estId) return { ok: false, error: "Estabelecimento inválido." };

  const { data: establishment, error: estErr } = await supabase
    .from("establishments")
    .select("id, client_id")
    .eq("id", estId)
    .maybeSingle();

  if (estErr || !establishment) {
    return { ok: false, error: "Estabelecimento inválido." };
  }

  const { data: clientRow, error: cErr } = await supabase
    .from("clients")
    .select("owner_user_id, kind")
    .eq("id", establishment.client_id)
    .maybeSingle();

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  if (
    cErr ||
    !clientRow ||
    clientRow.owner_user_id !== workspaceOwnerId ||
    clientRow.kind !== "pj"
  ) {
    return { ok: false, error: "Sem permissão para este estabelecimento." };
  }

  const { error } = await supabase
    .from("checklist_establishment_recent")
    .upsert(
      {
        user_id: user.id,
        establishment_id: estId,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: "user_id,establishment_id" },
    );

  if (error) {
    return { ok: false, error: "Não foi possível salvar estabelecimento recente." };
  }

  return { ok: true };
}

export async function loadEstablishmentsForClient(
  clientId: string,
): Promise<{ rows: EstablishmentRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as EstablishmentRow[] };
}

export async function createEstablishmentAction(
  _prev: EstablishmentFormResult | undefined,
  formData: FormData,
): Promise<EstablishmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!clientId) {
    return { ok: false, error: "Cliente em falta." };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, kind, owner_user_id")
    .eq("id", clientId)
    .maybeSingle();

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  if (
    !clientRow ||
    clientRow.owner_user_id !== workspaceOwnerId ||
    clientRow.kind !== "pj"
  ) {
    return {
      ok: false,
      error: "Só é possível criar estabelecimentos para clientes PJ da sua conta.",
    };
  }

  // Regra 1:1 — cada cliente só pode ter 1 estabelecimento.
  const { count: existingCount, error: countErr } = await supabase
    .from("establishments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (!countErr && (existingCount ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este cliente já possui um estabelecimento. Cada cliente só pode ter 1 estabelecimento (1 CNPJ = 1 cliente). Para registar uma nova unidade, crie um novo cliente.",
    };
  }

  const establishment_type = parseEstablishmentType(
    formData.get("establishment_type"),
  );
  if (!establishment_type) {
    return { ok: false, error: "Selecione o tipo de estabelecimento." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Indique o nome do estabelecimento." };
  }

  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  if (!address_line1) {
    return { ok: false, error: "Indique a morada (linha 1)." };
  }

  const address_line2Raw = String(formData.get("address_line2") ?? "").trim();
  const address_line2 =
    address_line2Raw.length > 0 ? address_line2Raw : null;

  const cityRaw = String(formData.get("city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const stateRaw = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase();
  if (stateRaw.length > 0 && stateRaw.length !== 2) {
    return { ok: false, error: "UF deve ter 2 letras (ex.: SP)." };
  }
  const state = stateRaw.length === 2 ? stateRaw : null;

  const postalRaw = String(formData.get("postal_code") ?? "").trim();
  const postal_code = postalRaw.length > 0 ? postalRaw : null;

  const { data, error } = await supabase
    .from("establishments")
    .insert({
      client_id: clientId,
      name,
      establishment_type,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível criar o estabelecimento." };
  }

  revalidateClientEstablishmentPaths(clientId, data.id);
  redirect(`/clientes/${clientId}/editar`);
}

export async function updateEstablishmentAction(
  _prev: EstablishmentFormResult | undefined,
  formData: FormData,
): Promise<EstablishmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!id || !clientId) {
    return { ok: false, error: "Dados em falta." };
  }

  const establishment_type = parseEstablishmentType(
    formData.get("establishment_type"),
  );
  if (!establishment_type) {
    return { ok: false, error: "Selecione o tipo de estabelecimento." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Indique o nome do estabelecimento." };
  }

  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  if (!address_line1) {
    return { ok: false, error: "Indique a morada (linha 1)." };
  }

  const address_line2Raw = String(formData.get("address_line2") ?? "").trim();
  const address_line2 =
    address_line2Raw.length > 0 ? address_line2Raw : null;

  const cityRaw = String(formData.get("city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const stateRaw = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase();
  if (stateRaw.length > 0 && stateRaw.length !== 2) {
    return { ok: false, error: "UF deve ter 2 letras (ex.: SP)." };
  }
  const state = stateRaw.length === 2 ? stateRaw : null;

  const postalRaw = String(formData.get("postal_code") ?? "").trim();
  const postal_code = postalRaw.length > 0 ? postalRaw : null;

  const { error } = await supabase
    .from("establishments")
    .update({
      name,
      establishment_type,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
    })
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  revalidateClientEstablishmentPaths(clientId, id);
  return { ok: true };
}

export async function deleteEstablishmentAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!id || !clientId) {
    redirect("/clientes");
  }

  const { count, error: countErr } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("establishment_id", id);

  if (!countErr && (count ?? 0) > 0) {
    redirect(
      `/clientes/${clientId}/estabelecimentos/${id}/editar?blocked=patients`,
    );
  }

  await supabase
    .from("establishments")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);

  revalidatePath("/pacientes");
  revalidateClientEstablishmentPaths(clientId);
  redirect(`/clientes/${clientId}/editar`);
}
