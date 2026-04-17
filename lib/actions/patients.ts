"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ClientKind } from "@/lib/types/clients";
import type {
  PatientRow,
  PatientSex,
  PatientWithContext,
} from "@/lib/types/patients";
import {
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-document";

export type PatientFormResult =
  | { ok: true }
  | { ok: false; error: string };

/** Revalida rotas relacionadas com o paciente.
 *  clientId pode ser null (paciente independente). */
function revalidatePatientPaths(
  clientId: string | null,
  establishmentId: string | null,
  patientId?: string,
) {
  revalidatePath("/pacientes");
  if (clientId) {
    revalidatePath(`/clientes/${clientId}/editar`);
    revalidatePath(`/clientes/${clientId}/pacientes/novo`);
    if (establishmentId) {
      revalidatePath(
        `/clientes/${clientId}/estabelecimentos/${establishmentId}/editar`,
      );
      revalidatePath(
        `/clientes/${clientId}/estabelecimentos/${establishmentId}/pacientes/novo`,
      );
    }
  }
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}/editar`);
    revalidatePath(`/pacientes/${patientId}/historico`);
  }
}

function parseSex(raw: unknown): PatientSex | null {
  if (raw === "female" || raw === "male" || raw === "other") return raw;
  if (raw === "" || raw == null) return null;
  return null;
}

function parseOptionalBirthDate(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  return { ok: true, value: t };
}

function parsePatientDocument(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (!isValidCpf(digits)) return { ok: false, error: "CPF inválido." };
  return { ok: true, value: digits };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function loadPatientsForScope(
  scope:
    | { variant: "client_pf"; clientId: string }
    | {
        variant: "establishment";
        clientId: string;
        establishmentId: string;
      },
): Promise<{ rows: PatientRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  let q = supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (scope.variant === "client_pf") {
    q = q.eq("client_id", scope.clientId).is("establishment_id", null);
  } else {
    q = q.eq("establishment_id", scope.establishmentId);
  }

  const { data, error } = await q;
  if (error || !data) return { rows: [] };
  return { rows: data as PatientRow[] };
}

/** Lista todos os pacientes do profissional autenticado, com joins de contexto.
 *  Suporta filtro por nome/CPF (q) e por cliente (clientId). */
export async function loadAllPatientsForOwner(
  filters?: { q?: string; clientId?: string },
): Promise<{ rows: PatientWithContext[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  let q = supabase
    .from("patients")
    .select(
      `
      *,
      clients ( legal_name, kind, lifecycle_status ),
      establishments ( name )
    `,
    )
    .order("full_name", { ascending: true });

  const search = filters?.q?.trim() ?? "";
  if (search) {
    // ilike no nome e no document_id (CPF)
    q = q.or(`full_name.ilike.%${search}%,document_id.ilike.%${search}%`);
  }
  if (filters?.clientId) {
    q = q.eq("client_id", filters.clientId);
  }

  const { data, error } = await q;
  if (error || !data) return { rows: [] };

  return { rows: data as unknown as PatientWithContext[] };
}

export async function loadPatientById(
  id: string,
): Promise<{ row: PatientRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { row: null };
  return { row: data as PatientRow };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/** Cria um paciente PF.
 *  client_id é OPCIONAL — paciente pode existir sem cliente associado.
 *  Quando fornecido, valida que o cliente pertence ao utilizador autenticado. */
export async function createPatientAction(
  _prev: PatientFormResult | undefined,
  formData: FormData,
): Promise<PatientFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // client_id é opcional (Story 2.1b — paciente pode ser independente)
  const clientIdRaw = String(formData.get("client_id") ?? "").trim();
  const client_id = clientIdRaw.length > 0 ? clientIdRaw : null;

  const establishmentRaw = String(
    formData.get("establishment_id") ?? "",
  ).trim();
  const establishment_id =
    establishmentRaw.length > 0 ? establishmentRaw : null;

  // Validar cliente se fornecido
  if (client_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, kind, owner_user_id")
      .eq("id", client_id)
      .maybeSingle();

    if (!clientRow || clientRow.owner_user_id !== user.id) {
      return { ok: false, error: "Cliente inválido." };
    }

    const kind = clientRow.kind as ClientKind;
    if (kind === "pf" && establishment_id !== null) {
      return { ok: false, error: "Paciente PF não pode ter estabelecimento." };
    }
    if (kind === "pj" && establishment_id === null) {
      return {
        ok: false,
        error: "Selecione o estabelecimento para paciente deste cliente PJ.",
      };
    }

    if (establishment_id) {
      const { data: est } = await supabase
        .from("establishments")
        .select("id, client_id")
        .eq("id", establishment_id)
        .maybeSingle();
      if (!est || est.client_id !== client_id) {
        return { ok: false, error: "Estabelecimento inválido." };
      }
    }
  } else if (establishment_id) {
    // Sem cliente não pode ter estabelecimento
    return { ok: false, error: "Selecione primeiro um cliente para o estabelecimento." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) {
    return { ok: false, error: "Indique o nome do paciente." };
  }

  const birthParsed = parseOptionalBirthDate(
    String(formData.get("birth_date") ?? ""),
  );
  if (!birthParsed.ok) {
    return { ok: false, error: birthParsed.error };
  }
  const birth_date = birthParsed.value;

  const docRaw = String(formData.get("document_id") ?? "").trim();
  const parsedDoc = parsePatientDocument(docRaw);
  if (!parsedDoc.ok) {
    return { ok: false, error: parsedDoc.error };
  }
  const document_id = parsedDoc.value;

  const sex = parseSex(formData.get("sex"));

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.length > 0 ? emailRaw : null;

  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      user_id: user.id,
      client_id,
      establishment_id,
      full_name,
      birth_date,
      document_id,
      sex,
      phone,
      email,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível criar o paciente." };
  }

  revalidatePatientPaths(client_id, establishment_id, data.id);
  redirect(`/pacientes/${data.id}/editar`);
}

export async function updatePatientAction(
  _prev: PatientFormResult | undefined,
  formData: FormData,
): Promise<PatientFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Identificador em falta." };
  }

  const { data: existing } = await supabase
    .from("patients")
    .select("client_id, establishment_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Paciente não encontrado." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) {
    return { ok: false, error: "Indique o nome do paciente." };
  }

  const birthParsed = parseOptionalBirthDate(
    String(formData.get("birth_date") ?? ""),
  );
  if (!birthParsed.ok) {
    return { ok: false, error: birthParsed.error };
  }
  const birth_date = birthParsed.value;

  const docRaw = String(formData.get("document_id") ?? "").trim();
  const parsedDoc = parsePatientDocument(docRaw);
  if (!parsedDoc.ok) {
    return { ok: false, error: parsedDoc.error };
  }
  const document_id = parsedDoc.value;

  const sex = parseSex(formData.get("sex"));

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.length > 0 ? emailRaw : null;

  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const { error } = await supabase
    .from("patients")
    .update({
      full_name,
      birth_date,
      document_id,
      sex,
      phone,
      email,
      notes,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  revalidatePatientPaths(
    existing.client_id as string | null,
    existing.establishment_id as string | null,
    id,
  );
  return { ok: true };
}

export async function deletePatientAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/pacientes");

  const { data: row } = await supabase
    .from("patients")
    .select("client_id, establishment_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) redirect("/pacientes");

  await supabase.from("patients").delete().eq("id", id);

  const clientId = row.client_id as string | null;
  const establishmentId = row.establishment_id as string | null;

  revalidatePatientPaths(clientId, establishmentId, id);

  // Redirecionar de volta ao contexto correto
  if (clientId && establishmentId) {
    redirect(
      `/clientes/${clientId}/estabelecimentos/${establishmentId}/editar`,
    );
  } else if (clientId) {
    redirect(`/clientes/${clientId}/editar`);
  } else {
    redirect("/pacientes");
  }
}
