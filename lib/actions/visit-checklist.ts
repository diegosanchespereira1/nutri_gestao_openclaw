"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { loadScheduledVisitById } from "@/lib/actions/visits";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import { createClient } from "@/lib/supabase/server";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import type {
  EstablishmentType,
  EstablishmentWithClientNames,
} from "@/lib/types/establishments";

export type VisitChecklistOption =
  | { kind: "global"; templateId: string; label: string }
  | { kind: "custom"; customTemplateId: string; label: string };

type EstPick = { id: string; label: string };

function parseChoice(raw: string):
  | { kind: "global"; id: string }
  | { kind: "custom"; id: string }
  | null {
  const s = raw.trim();
  const g = s.match(/^global:([0-9a-f-]{36})$/i);
  if (g) return { kind: "global", id: g[1] };
  const c = s.match(/^custom:([0-9a-f-]{36})$/i);
  if (c) return { kind: "custom", id: c[1] };
  return null;
}

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  establishmentId: string,
): Promise<boolean> {
  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) return false;
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id)
    .maybeSingle();
  return Boolean(cl && cl.owner_user_id === userId);
}

export async function markScheduledVisitInProgress(
  visitId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("scheduled_visits")
    .select("status")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row || row.status !== "scheduled") return;

  await supabase
    .from("scheduled_visits")
    .update({ status: "in_progress" })
    .eq("id", visitId)
    .eq("user_id", user.id);

  // Não chamar revalidatePath durante o render do RSC (ex.: página iniciar).
  after(() => {
    revalidatePath("/visitas");
    revalidatePath("/inicio");
    revalidatePath(`/visitas/${visitId}`);
  });
}

async function loadPatientEstablishmentOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  userId: string,
): Promise<EstPick[] | null> {
  const { data: pat, error } = await supabase
    .from("patients")
    .select("id, establishment_id, client_id")
    .eq("id", patientId)
    .maybeSingle();

  if (error || !pat) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", pat.client_id as string)
    .maybeSingle();

  if (!client || client.owner_user_id !== userId) return null;

  if (pat.establishment_id) {
    return [{ id: pat.establishment_id as string, label: "" }];
  }

  const { data: estRows } = await supabase
    .from("establishments")
    .select("id, name, clients(legal_name, trade_name, lifecycle_status)")
    .eq("client_id", pat.client_id as string);

  const picks: EstPick[] = [];
  for (const raw of estRows ?? []) {
    const e = raw as unknown as {
      id: string;
      name: string;
      clients:
        | { legal_name: string; trade_name: string | null }
        | { legal_name: string; trade_name: string | null }[]
        | null;
    };
    const c = Array.isArray(e.clients) ? e.clients[0] : e.clients;
    const clientLabel =
      c?.trade_name?.trim() && c.trade_name.trim().length > 0
        ? c.trade_name.trim()
        : (c?.legal_name ?? "");
    picks.push({
      id: e.id,
      label: `${e.name} — ${clientLabel}`,
    });
  }
  return picks;
}

/** Resolve o estabelecimento usado para portaria / checklist (visita a estabelecimento ou paciente). */
export async function resolveVisitChecklistEstablishmentId(input: {
  visit: ScheduledVisitWithTargets;
  userId: string;
  ctxEstablishmentId: string | null;
}): Promise<
  | { ok: true; establishmentId: string }
  | { ok: false; reason: "no_context"; message: string }
  | { ok: false; reason: "pick"; options: EstPick[] }
> {
  const { visit, userId, ctxEstablishmentId } = input;
  const supabase = await createClient();

  if (visit.target_type === "establishment") {
    const eid = visit.establishment_id;
    if (!eid) {
      return {
        ok: false,
        reason: "no_context",
        message: "Visita sem estabelecimento associado.",
      };
    }
    const ok = await assertEstablishmentOwned(supabase, userId, eid);
    if (!ok) {
      return {
        ok: false,
        reason: "no_context",
        message: "Estabelecimento inválido.",
      };
    }
    return { ok: true, establishmentId: eid };
  }

  const opts = await loadPatientEstablishmentOptions(
    supabase,
    visit.patient_id as string,
    userId,
  );
  if (!opts || opts.length === 0) {
    return {
      ok: false,
      reason: "no_context",
      message:
        "Não há estabelecimento para aplicar checklists regulatórios nesta visita. Cadastre um estabelecimento para o cliente ou utilize a área Checklists no menu.",
    };
  }

  if (opts.length === 1) {
    return { ok: true, establishmentId: opts[0].id };
  }

  if (ctxEstablishmentId) {
    const match = opts.find((o) => o.id === ctxEstablishmentId);
    if (match) {
      return { ok: true, establishmentId: match.id };
    }
  }

  return { ok: false, reason: "pick", options: opts };
}

async function loadCustomTemplateRowsForEstablishment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  establishmentId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("checklist_custom_templates")
    .select("id, name")
    .eq("user_id", userId)
    .eq("establishment_id", establishmentId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
}

export async function buildVisitChecklistOptions(input: {
  establishmentId: string;
  userId: string;
}): Promise<VisitChecklistOption[]> {
  const supabase = await createClient();
  const { establishmentId, userId } = input;

  const { data: est } = await supabase
    .from("establishments")
    .select("id, state, establishment_type")
    .eq("id", establishmentId)
    .maybeSingle();

  const { templates: allTemplates } = await loadChecklistCatalog();
  const filtered = filterTemplatesForEstablishment(
    allTemplates,
    est
      ? {
          state: est.state as string | null,
          establishment_type: est.establishment_type as EstablishmentType,
        }
      : null,
  );

  const customs = await loadCustomTemplateRowsForEstablishment(
    supabase,
    userId,
    establishmentId,
  );

  const options: VisitChecklistOption[] = [];

  for (const c of customs) {
    options.push({
      kind: "custom",
      customTemplateId: c.id,
      label: `Personalizado: ${c.name}`,
    });
  }
  for (const t of filtered) {
    options.push({
      kind: "global",
      templateId: t.id,
      label: t.name,
    });
  }

  return options;
}

export async function getLatestFillSessionIdForVisit(
  visitId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("checklist_fill_sessions")
    .select("id")
    .eq("scheduled_visit_id", visitId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? (data.id as string) : null;
}

export async function insertVisitChecklistFillSession(input: {
  visitId: string;
  userId: string;
  establishmentId: string;
  option: VisitChecklistOption;
}): Promise<{ sessionId: string } | { error: string }> {
  const supabase = await createClient();
  const { visitId, userId, establishmentId, option } = input;

  const owned = await assertEstablishmentOwned(supabase, userId, establishmentId);
  if (!owned) return { error: "Estabelecimento inválido." };

  const { data: visit } = await supabase
    .from("scheduled_visits")
    .select("id, user_id")
    .eq("id", visitId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!visit) return { error: "Visita não encontrada." };

  if (option.kind === "global") {
    const { data: template } = await supabase
      .from("checklist_templates")
      .select("id")
      .eq("id", option.templateId)
      .eq("is_active", true)
      .maybeSingle();

    if (!template) return { error: "Modelo indisponível." };

    const { data: session, error } = await supabase
      .from("checklist_fill_sessions")
      .insert({
        user_id: userId,
        establishment_id: establishmentId,
        template_id: option.templateId,
        custom_template_id: null,
        scheduled_visit_id: visitId,
      })
      .select("id")
      .single();

    if (error || !session) return { error: "Não foi possível iniciar o checklist." };
    return { sessionId: session.id as string };
  }

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id")
    .eq("id", option.customTemplateId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!ct || ct.establishment_id !== establishmentId) {
    return { error: "Modelo personalizado inválido." };
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: userId,
      establishment_id: establishmentId,
      template_id: null,
      custom_template_id: option.customTemplateId,
      scheduled_visit_id: visitId,
    })
    .select("id")
    .single();

  if (error || !session) return { error: "Não foi possível iniciar o checklist." };
  return { sessionId: session.id as string };
}

export async function chooseVisitEstablishmentContextAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const visitId = String(formData.get("visit_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  if (!visitId || !establishmentId) {
    redirect(`/visitas?err=ctx`);
  }

  const { row } = await loadScheduledVisitById(visitId);
  if (!row || row.user_id !== user.id) {
    redirect("/visitas");
  }

  const resolved = await resolveVisitChecklistEstablishmentId({
    visit: row,
    userId: user.id,
    ctxEstablishmentId: null,
  });

  if (resolved.ok) {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }
  if (resolved.reason !== "pick") {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }

  const allowed = resolved.options.some((o) => o.id === establishmentId);
  if (!allowed) {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }

  redirect(`/visitas/${visitId}/iniciar?ctx_est=${establishmentId}`);
}

export async function createVisitChecklistSessionAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const visitId = String(formData.get("visit_id") ?? "").trim();
  const choiceRaw = String(formData.get("choice") ?? "").trim();
  const ctxEst = String(formData.get("ctx_establishment_id") ?? "").trim();
  const ctxEstablishmentId = ctxEst.length > 0 ? ctxEst : null;

  const choice = parseChoice(choiceRaw);
  if (!visitId || !choice) {
    redirect(`/visitas/${visitId}/iniciar?err=missing`);
  }

  const { row } = await loadScheduledVisitById(visitId);
  if (!row) redirect("/visitas");

  const resolved = await resolveVisitChecklistEstablishmentId({
    visit: row,
    userId: user.id,
    ctxEstablishmentId,
  });

  if (!resolved.ok) {
    redirect(`/visitas/${visitId}/iniciar?err=context`);
  }

  const option: VisitChecklistOption =
    choice.kind === "global"
      ? {
          kind: "global",
          templateId: choice.id,
          label: "",
        }
      : {
          kind: "custom",
          customTemplateId: choice.id,
          label: "",
        };

  const result = await insertVisitChecklistFillSession({
    visitId,
    userId: user.id,
    establishmentId: resolved.establishmentId,
    option,
  });

  if ("error" in result) {
    redirect(`/visitas/${visitId}/iniciar?err=session`);
  }

  revalidatePath(`/visitas/${visitId}/iniciar`);
  revalidatePath(`/visitas/${visitId}`);
  redirect(`/visitas/${visitId}/iniciar?session=${result.sessionId}`);
}

function countFillProgress(
  template: ChecklistTemplateWithSections,
  responses: FillResponsesMap,
): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const sec of template.sections) {
    for (const it of sec.items) {
      total += 1;
      if (responses[it.id]?.outcome != null) done += 1;
    }
  }
  return { done, total };
}

const NC_HISTORY_SESSION_CHUNK = 100;

/** Conta, por item do modelo atual, em quantas sessões anteriores (mesmo user + estabelecimento) houve NC. */
async function loadRecurringNcSessionCountByItem(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  establishmentId: string;
  currentSessionId: string;
  template: ChecklistTemplateWithSections;
  itemResponseSource: "global" | "custom";
}): Promise<Record<string, number>> {
  const {
    supabase,
    userId,
    establishmentId,
    currentSessionId,
    template,
    itemResponseSource,
  } = input;

  const currentIds = new Set<string>();
  for (const sec of template.sections) {
    for (const it of sec.items) {
      currentIds.add(it.id);
    }
  }

  const { data: sessions } = await supabase
    .from("checklist_fill_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("establishment_id", establishmentId)
    .neq("id", currentSessionId);

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return {};

  type NcRow = {
    session_id: string;
    template_item_id: string | null;
    custom_item_id: string | null;
  };

  const respRows: NcRow[] = [];
  for (let i = 0; i < sessionIds.length; i += NC_HISTORY_SESSION_CHUNK) {
    const chunk = sessionIds.slice(i, i + NC_HISTORY_SESSION_CHUNK);
    const { data: part } = await supabase
      .from("checklist_fill_item_responses")
      .select("session_id, template_item_id, custom_item_id")
      .in("session_id", chunk)
      .eq("outcome", "nc");
    for (const r of part ?? []) {
      respRows.push(r as NcRow);
    }
  }

  const distinctSessionsByItem = new Map<string, Set<string>>();

  for (const r of respRows) {
    const itemId =
      itemResponseSource === "global"
        ? r.template_item_id
        : r.custom_item_id;
    if (!itemId || !currentIds.has(itemId)) continue;

    let set = distinctSessionsByItem.get(itemId);
    if (!set) {
      set = new Set();
      distinctSessionsByItem.set(itemId, set);
    }
    set.add(r.session_id);
  }

  const out: Record<string, number> = {};
  for (const [itemId, set] of distinctSessionsByItem) {
    out[itemId] = set.size;
  }
  return out;
}

export type VisitChecklistWizardModel = {
  visit: ScheduledVisitWithTargets;
  sessionId: string;
  fill: NonNullable<Awaited<ReturnType<typeof loadFillSessionPageData>>>;
  progress: { done: number; total: number };
  /** Por item: nº de sessões anteriores neste estabelecimento com NC (FR21). */
  recurringNcSessionCountByItemId: Record<string, number>;
  establishmentContextLabel: string;
};

/** Valida sessão de preenchimento ligada à visita e devolve dados para o wizard. */
export async function loadVisitChecklistWizardModel(input: {
  visit: ScheduledVisitWithTargets;
  sessionId: string;
  userId: string;
}): Promise<VisitChecklistWizardModel | null> {
  const supabase = await createClient();
  const { visit, sessionId, userId } = input;

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, scheduled_visit_id, user_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!sess || sess.scheduled_visit_id !== visit.id) return null;

  const fill = await loadFillSessionPageData(sessionId);
  if (!fill) return null;

  const progress = countFillProgress(fill.template, fill.responses);

  const { data: est } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .eq("id", fill.session.establishment_id)
    .maybeSingle();

  const establishmentContextLabel = est
    ? `${(est as EstablishmentWithClientNames).name} — ${establishmentClientLabel(est as EstablishmentWithClientNames)}`
    : fill.establishmentLabel;

  const recurringNcSessionCountByItemId = await loadRecurringNcSessionCountByItem({
    supabase,
    userId,
    establishmentId: fill.session.establishment_id,
    currentSessionId: sessionId,
    template: fill.template,
    itemResponseSource: fill.itemResponseSource,
  });

  return {
    visit,
    sessionId,
    fill,
    progress,
    recurringNcSessionCountByItemId,
    establishmentContextLabel,
  };
}
