"use server";

// Story 2.6: Server Actions para importação em bulk de clientes, estabelecimentos e pacientes.
// Segurança: auth obrigatório; owner_user_id sempre do token JWT, nunca do cliente.

import { createClient } from "@/lib/supabase/server";
import type {
  ClientImportRow,
  EstablishmentImportRow,
  ImportResult,
  PatientImportRow,
} from "@/lib/types/import";

const MAX_ROWS = 500;

// ── Importar Clientes ───────────────────────────────────────────────────────

export async function importClientsAction(
  rows: ClientImportRow[],
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // Limite de segurança server-side (NFR7)
  const safe = rows.slice(0, MAX_ROWS);

  // Enriquecer com owner_user_id do token — nunca do client
  const records = safe.map((r) => ({ ...r, owner_user_id: user.id }));

  const { error } = await supabase.from("clients").insert(records);

  if (error) {
    console.error("[import:clients] erro:", error.code);
    return { ok: false, error: "Erro ao importar clientes. Verifique os dados e tente novamente." };
  }

  return { ok: true, imported: records.length, skipped: rows.length - records.length };
}

// ── Importar Estabelecimentos ───────────────────────────────────────────────

export async function importEstablishmentsAction(
  rows: EstablishmentImportRow[],
  clientId: string,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // Verificar que o clientId pertence ao tenant autenticado (RLS garante na query abaixo,
  // mas verificamos explicitamente para dar erro claro antes do insert)
  const { data: clientCheck, error: checkError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  const safe = rows.slice(0, MAX_ROWS);
  const records = safe.map((r) => ({ ...r, client_id: clientId }));

  const { error } = await supabase.from("establishments").insert(records);

  if (error) {
    console.error("[import:establishments] erro:", error.code);
    return { ok: false, error: "Erro ao importar estabelecimentos. Verifique os dados e tente novamente." };
  }

  return { ok: true, imported: records.length, skipped: rows.length - records.length };
}

// ── Importar Pacientes ──────────────────────────────────────────────────────

export async function importPatientsAction(
  rows: PatientImportRow[],
  clientId: string,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // Verificar ownership do cliente (RLS garante, mas dá feedback claro)
  const { data: clientCheck, error: checkError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  const safe = rows.slice(0, MAX_ROWS);
  const records = safe.map((r) => ({ ...r, client_id: clientId }));

  const { error } = await supabase.from("patients").insert(records);

  if (error) {
    console.error("[import:patients] erro:", error.code);
    return { ok: false, error: "Erro ao importar pacientes. Verifique os dados e tente novamente." };
  }

  return { ok: true, imported: records.length, skipped: rows.length - records.length };
}
