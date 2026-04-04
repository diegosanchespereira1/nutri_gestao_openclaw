"use server";

// Story 2.6: Server Actions para importação em bulk de clientes, estabelecimentos e pacientes.
// Segurança: auth obrigatório; owner_user_id sempre do token JWT, nunca do cliente.

import { createClient } from "@/lib/supabase/server";
import type { ImportResult } from "@/lib/types/import";
import {
  MAX_IMPORT_ROWS,
  parseImportClientsPayload,
  parseImportEstablishmentsPayload,
  parseImportPatientsPayload,
} from "@/lib/validators/import-rows";

// ── Importar Clientes ───────────────────────────────────────────────────────

export async function importClientsAction(
  rows: unknown,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = parseImportClientsPayload(rows);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const records = parsed.rows.map((r) => ({ ...r, owner_user_id: user.id }));

  const { error } = await supabase.from("clients").insert(records);

  if (error) {
    console.error("[import:clients] erro:", error.code);
    return { ok: false, error: "Erro ao importar clientes. Verifique os dados e tente novamente." };
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0;
  return {
    ok: true,
    imported: records.length,
    skipped: rowCount > MAX_IMPORT_ROWS ? rowCount - MAX_IMPORT_ROWS : 0,
  };
}

// ── Importar Estabelecimentos ───────────────────────────────────────────────

export async function importEstablishmentsAction(
  rows: unknown,
  clientId: unknown,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = parseImportEstablishmentsPayload(rows, clientId);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: clientCheck, error: checkError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  const records = parsed.rows.map((r) => ({
    ...r,
    client_id: parsed.clientId,
  }));

  const { error } = await supabase.from("establishments").insert(records);

  if (error) {
    console.error("[import:establishments] erro:", error.code);
    return { ok: false, error: "Erro ao importar estabelecimentos. Verifique os dados e tente novamente." };
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0;
  return {
    ok: true,
    imported: records.length,
    skipped: rowCount > MAX_IMPORT_ROWS ? rowCount - MAX_IMPORT_ROWS : 0,
  };
}

// ── Importar Pacientes ──────────────────────────────────────────────────────

export async function importPatientsAction(
  rows: unknown,
  clientId: unknown,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = parseImportPatientsPayload(rows, clientId);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: clientCheck, error: checkError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  const records = parsed.rows.map((r) => ({
    ...r,
    client_id: parsed.clientId,
    sex: r.sex ?? null,
  }));

  const { error } = await supabase.from("patients").insert(records);

  if (error) {
    console.error("[import:patients] erro:", error.code);
    return { ok: false, error: "Erro ao importar pacientes. Verifique os dados e tente novamente." };
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0;
  return {
    ok: true,
    imported: records.length,
    skipped: rowCount > MAX_IMPORT_ROWS ? rowCount - MAX_IMPORT_ROWS : 0,
  };
}
