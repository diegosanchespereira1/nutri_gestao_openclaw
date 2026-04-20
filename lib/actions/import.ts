"use server";

// Story 2.6: Server Actions para importação em bulk de clientes, estabelecimentos e pacientes.
// Segurança: auth obrigatório; owner_user_id sempre do token JWT, nunca do cliente.

import { createClient } from "@/lib/supabase/server";
import { establishmentTypeFromSegment } from "@/lib/constants/establishment-types";
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

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert(records)
    .select("id, kind, legal_name, trade_name, business_segment");

  if (error) {
    console.error("[import:clients] erro:", error.code);
    return { ok: false, error: "Erro ao importar clientes. Verifique os dados e tente novamente." };
  }

  // Criar estabelecimento para cada cliente PJ importado (regra: 1 PJ = 1 estabelecimento).
  // Usa business_segment para derivar o establishment_type, assim como createClientAction.
  if (inserted && inserted.length > 0) {
    const pjClients = (inserted as {
      id: string;
      kind: string;
      legal_name: string;
      trade_name: string | null;
      business_segment: string | null;
    }[]).filter((c) => c.kind === "pj");

    for (const c of pjClients) {
      const estName = c.trade_name?.trim() || c.legal_name;
      const establishment_type = establishmentTypeFromSegment(c.business_segment);
      const { error: estErr } = await supabase.from("establishments").insert({
        client_id: c.id,
        name: estName,
        establishment_type,
      });
      if (estErr) {
        // Loga mas não aborta — cliente foi criado; estabelecimento pode ser completado depois.
        console.error("[import:clients] establishment insert failed for client", c.id, estErr.message);
      }
    }
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
    .select("id, kind")
    .eq("id", parsed.clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  // Com a constraint establishments_one_per_client (unique por client_id),
  // clientes PJ já têm 1 estabelecimento. Usamos upsert para atualizar se existir.
  const { data: existing } = await supabase
    .from("establishments")
    .select("id")
    .eq("client_id", parsed.clientId)
    .maybeSingle();

  let imported = 0;
  let skipped = 0;

  if (existing) {
    // Atualizar o único estabelecimento existente com os dados da primeira linha.
    const firstRow = parsed.rows[0];
    if (!firstRow) {
      return { ok: false, error: "Nenhuma linha de dados encontrada." };
    }
    const { error } = await supabase
      .from("establishments")
      .update({
        name: firstRow.name,
        establishment_type: firstRow.establishment_type,
        address_line1: firstRow.address_line1 ?? null,
        city: firstRow.city ?? null,
        state: firstRow.state ?? null,
        postal_code: firstRow.postal_code ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[import:establishments] erro update:", error.code);
      return { ok: false, error: "Erro ao atualizar estabelecimento. Verifique os dados e tente novamente." };
    }
    imported = 1;
    skipped = parsed.rows.length - 1;
  } else {
    // Inserir normalmente (PJ sem estabelecimento ainda, ou PF — sem constraint 1:1 para PF).
    const records = parsed.rows.map((r) => ({
      ...r,
      client_id: parsed.clientId,
    }));

    const { error } = await supabase.from("establishments").insert(records);

    if (error) {
      console.error("[import:establishments] erro insert:", error.code);
      return { ok: false, error: "Erro ao importar estabelecimentos. Verifique os dados e tente novamente." };
    }
    imported = records.length;
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0;
  return {
    ok: true,
    imported,
    skipped: skipped + (rowCount > MAX_IMPORT_ROWS ? rowCount - MAX_IMPORT_ROWS : 0),
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
    .select("id, kind")
    .eq("id", parsed.clientId)
    .single();

  if (checkError || !clientCheck) {
    return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
  }

  const clientKind = (clientCheck as { id: string; kind: string }).kind;

  // Para pacientes de clientes PJ: obter o establishment_id automaticamente.
  // O trigger patients_enforce_vinculo exige establishment_id para PJ.
  let establishmentId: string | null = null;
  if (clientKind === "pj") {
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("client_id", parsed.clientId)
      .maybeSingle();

    if (!est) {
      return {
        ok: false,
        error: "Cliente PJ sem estabelecimento cadastrado. Cadastre o estabelecimento antes de importar pacientes.",
      };
    }
    establishmentId = est.id as string;
  }

  const records = parsed.rows.map((r) => ({
    ...r,
    user_id: user.id,
    client_id: parsed.clientId,
    sex: r.sex ?? null,
    establishment_id: establishmentId,
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
