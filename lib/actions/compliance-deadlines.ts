"use server";

import { revalidatePath } from "next/cache";

import { addCalendarDays, todayKey } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import type {
  ComplianceDashboardAlert,
  EstablishmentComplianceDeadlineRow,
} from "@/lib/types/compliance-deadlines";

const TITLE_MAX = 200;
const NOTES_MAX = 2000;

function parseDueDate(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

export async function loadComplianceDashboardAlerts(
  timeZone: string,
): Promise<ComplianceDashboardAlert[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tKey = todayKey(new Date(), timeZone);
  const horizon = addCalendarDays(tKey, 90, timeZone);
  const pastCap = addCalendarDays(tKey, -365, timeZone);

  const res = await supabase
    .from("establishment_compliance_deadlines")
    .select(
      `
      id,
      establishment_id,
      title,
      portaria_ref,
      checklist_template_id,
      due_date,
      notes,
      created_at,
      updated_at,
      establishments (
        name,
        client_id
      )
    `,
    )
    .gte("due_date", pastCap)
    .lte("due_date", horizon)
    .order("due_date", { ascending: true });

  if (res.error || !res.data) {
    return [];
  }

  const out: ComplianceDashboardAlert[] = [];
  for (const row of res.data) {
    const est = row.establishments as
      | { name: string; client_id: string }
      | { name: string; client_id: string }[]
      | null
      | undefined;
    const e = Array.isArray(est) ? est[0] : est;
    if (!e?.client_id || !e.name) continue;
    const base = row as Record<string, unknown>;
    out.push({
      id: base.id as string,
      establishment_id: base.establishment_id as string,
      title: base.title as string,
      portaria_ref: (base.portaria_ref as string | null) ?? null,
      checklist_template_id:
        (base.checklist_template_id as string | null) ?? null,
      due_date: String(base.due_date).slice(0, 10),
      notes: (base.notes as string | null) ?? null,
      created_at: base.created_at as string,
      updated_at: base.updated_at as string,
      establishment_name: e.name,
      client_id: e.client_id,
    });
  }
  return out;
}

export async function loadComplianceDeadlinesForEstablishment(
  establishmentId: string,
): Promise<EstablishmentComplianceDeadlineRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("establishment_compliance_deadlines")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("due_date", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as EstablishmentComplianceDeadlineRow[];
}

export async function createComplianceDeadlineAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const establishmentId = String(
    formData.get("establishment_id") ?? "",
  ).trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const portariaRef = String(formData.get("portaria_ref") ?? "").trim();
  const templateRaw = String(
    formData.get("checklist_template_id") ?? "",
  ).trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  const due = parseDueDate(dueRaw);
  if (!establishmentId || !clientId) {
    return { ok: false, error: "Dados do estabelecimento em falta." };
  }
  if (title.length === 0 || title.length > TITLE_MAX) {
    return { ok: false, error: "Título inválido (1–200 caracteres)." };
  }
  if (!due) return { ok: false, error: "Data limite inválida." };

  const { data: est } = await supabase
    .from("establishments")
    .select("id, client_id")
    .eq("id", establishmentId)
    .maybeSingle();

  if (!est || est.client_id !== clientId) {
    return { ok: false, error: "Estabelecimento inválido." };
  }

  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id, kind")
    .eq("id", clientId)
    .maybeSingle();

  if (!cl || cl.owner_user_id !== user.id || cl.kind !== "pj") {
    return { ok: false, error: "Sem permissão." };
  }

  let checklist_template_id: string | null =
    templateRaw.length > 0 ? templateRaw : null;
  if (checklist_template_id) {
    const { data: tpl } = await supabase
      .from("checklist_templates")
      .select("id")
      .eq("id", checklist_template_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!tpl) checklist_template_id = null;
  }

  const notes =
    notesRaw.length > 0 ? notesRaw.slice(0, NOTES_MAX) : null;
  const portaria_ref =
    portariaRef.length > 0 ? portariaRef.slice(0, 120) : null;

  const { error } = await supabase
    .from("establishment_compliance_deadlines")
    .insert({
      establishment_id: establishmentId,
      title,
      due_date: due,
      portaria_ref,
      checklist_template_id,
      notes,
    });

  if (error) return { ok: false, error: "Não foi possível criar o prazo." };

  revalidatePath(`/clientes/${clientId}/estabelecimentos/${establishmentId}/editar`);
  revalidatePath("/inicio");
  return { ok: true };
}

export async function deleteComplianceDeadlineFormAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const deadlineId = String(formData.get("deadline_id") ?? "").trim();
  const establishmentId = String(
    formData.get("establishment_id") ?? "",
  ).trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!deadlineId || !establishmentId || !clientId) {
    return { ok: false, error: "Dados em falta." };
  }

  const { error } = await supabase
    .from("establishment_compliance_deadlines")
    .delete()
    .eq("id", deadlineId)
    .eq("establishment_id", establishmentId);

  if (error) return { ok: false, error: "Não foi possível eliminar." };

  revalidatePath(`/clientes/${clientId}/estabelecimentos/${establishmentId}/editar`);
  revalidatePath("/inicio");
  return { ok: true };
}
