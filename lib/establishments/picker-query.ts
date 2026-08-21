import { labelForEstablishmentType } from "@/lib/constants/establishment-types";
import { createClient } from "@/lib/supabase/server";
import type {
  EstablishmentPickerOption,
  EstablishmentRow,
  EstablishmentWithClientNames,
} from "@/lib/types/establishments";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

type EstablishmentClientJoin = EstablishmentWithClientNames["clients"];

export type EstablishmentPickerDbRow = {
  id: string;
  client_id: string;
  name: string;
  state: string | null;
  establishment_type: EstablishmentRow["establishment_type"];
  clients: EstablishmentClientJoin | EstablishmentClientJoin[] | null;
};

const PICKER_SELECT =
  "id, client_id, name, state, establishment_type, clients!inner(legal_name, trade_name, lifecycle_status, owner_user_id, kind)";

function pickClientJoin(
  input: EstablishmentPickerDbRow["clients"],
): EstablishmentClientJoin | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
}

export function mapRowToPickerOption(
  row: EstablishmentPickerDbRow,
  customLabels?: ReadonlyArray<{ slug: string; label: string }>,
): EstablishmentPickerOption | null {
  const client = pickClientJoin(row.clients);
  if (!client) return null;
  if (!row.client_id) return null;

  const uf = row.state?.toUpperCase() ?? "UF não definida";
  const clientLabel = client.trade_name?.trim() || client.legal_name;
  const typeLabel = labelForEstablishmentType(
    row.establishment_type,
    customLabels,
  );
  return {
    id: row.id,
    client_id: row.client_id,
    label: `${row.name} — ${clientLabel} (${uf} · ${typeLabel})`,
    state: row.state,
    establishment_type: row.establishment_type,
  };
}

async function getPickerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (!workspaceOwnerId) return null;
  return { supabase, workspaceOwnerId };
}

export async function searchOwnerEstablishments(params: {
  query: string;
  limit?: number;
}): Promise<{ rows: EstablishmentPickerOption[] }> {
  const ctx = await getPickerContext();
  if (!ctx) return { rows: [] };

  const query = params.query.trim();
  if (query.length < 3) return { rows: [] };

  const limit = Math.min(15, Math.max(1, params.limit ?? 12));
  const q = `%${query}%`;
  const { supabase, workspaceOwnerId } = ctx;

  const { data: byEstablishmentName, error: byEstErr } = await supabase
    .from("establishments")
    .select(PICKER_SELECT)
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
      .select(PICKER_SELECT)
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

export async function loadOwnerChecklistEstablishmentsDropdown(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: EstablishmentPickerOption[]; total: number }> {
  const ctx = await getPickerContext();
  if (!ctx) return { rows: [], total: 0 };

  const limit = Math.min(120, Math.max(20, params?.limit ?? 80));
  const offset = Math.max(0, params?.offset ?? 0);
  const { supabase, workspaceOwnerId } = ctx;

  const { data, error, count } = await supabase
    .from("establishments")
    .select(PICKER_SELECT, { count: "exact" })
    .eq("clients.owner_user_id", workspaceOwnerId)
    .eq("clients.kind", "pj")
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data?.length) {
    return { rows: [], total: count ?? 0 };
  }

  const rows = (data as unknown as EstablishmentPickerDbRow[])
    .map((row) => mapRowToPickerOption(row))
    .filter((row): row is EstablishmentPickerOption => Boolean(row));

  return { rows, total: count ?? rows.length };
}

export async function loadEstablishmentPickerOptionById(
  establishmentId: string,
): Promise<EstablishmentPickerOption | null> {
  const ctx = await getPickerContext();
  if (!ctx) return null;

  const { supabase, workspaceOwnerId } = ctx;
  const { data: row, error } = await supabase
    .from("establishments")
    .select(PICKER_SELECT)
    .eq("id", establishmentId)
    .eq("clients.owner_user_id", workspaceOwnerId)
    .eq("clients.kind", "pj")
    .maybeSingle();

  if (error || !row) return null;
  return mapRowToPickerOption(row as unknown as EstablishmentPickerDbRow);
}
