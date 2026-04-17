"use server";

import { createClient } from "@/lib/supabase/server";
import type { EstablishmentType } from "@/lib/types/establishments";

/* ─── Tipos exportados ───────────────────────────────────────────────────── */

export type ChecklistSessionSummary = {
  id: string;
  started_by_label: string;
  created_at: string;
  updated_at: string;
  dossier_approved_at: string | null;
  status: "em_andamento" | "aprovado";
  template_name: string;
  portaria_ref: string | null;
  establishment_id: string;
  establishment_name: string;
  establishment_type: EstablishmentType;
  conformant_count: number;
  nc_count: number;
  na_count: number;
  pending_count: number;
  total_items: number;
};

export type NcItemDetail = {
  item_id: string;
  description: string;
  is_required: boolean;
  note: string | null;
  item_annotation: string | null;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

async function assertClientOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clientId: string,
): Promise<boolean> {
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", clientId)
    .maybeSingle();
  return Boolean(cl && cl.owner_user_id === userId);
}

/* ─── E.1: loadChecklistSessionsForClient ───────────────────────────────── */

/**
 * Carrega o histórico de checklists de todos os estabelecimentos de um cliente,
 * com métricas calculadas (conforme / NC / NA / pendente).
 * Valida que o usuário autenticado é owner do cliente antes de qualquer query.
 */
export async function loadChecklistSessionsForClient(input: {
  clientId: string;
  establishmentId?: string | null;
  status?: "em_andamento" | "aprovado" | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ChecklistSessionSummary[]; total: number }> {
  const empty = { rows: [], total: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownUserLabel = String(ownProfile?.full_name ?? "").trim() || "Você";

  // VALIDAÇÃO DE POSSE — obrigatória antes de qualquer query de dados.
  const owned = await assertClientOwned(supabase, user.id, input.clientId);
  if (!owned) return empty;

  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  // 1. Buscar establishments do cliente
  let estQuery = supabase
    .from("establishments")
    .select("id, name, establishment_type")
    .eq("client_id", input.clientId);

  if (input.establishmentId) {
    estQuery = estQuery.eq("id", input.establishmentId);
  }

  const { data: estRows } = await estQuery;
  if (!estRows || estRows.length === 0) return empty;

  const estMap = new Map<
    string,
    { name: string; establishment_type: EstablishmentType }
  >();
  for (const e of estRows) {
    estMap.set(e.id, {
      name: e.name,
      establishment_type: e.establishment_type as EstablishmentType,
    });
  }
  const estIds = [...estMap.keys()];

  // 2. Buscar sessões para esses estabelecimentos
  let sessionQuery = supabase
    .from("checklist_fill_sessions")
    .select(
      "id, user_id, establishment_id, template_id, custom_template_id, dossier_approved_at, created_at, updated_at",
      { count: "exact" },
    )
    .in("establishment_id", estIds)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.status === "aprovado") {
    sessionQuery = sessionQuery.not("dossier_approved_at", "is", null);
  } else if (input.status === "em_andamento") {
    sessionQuery = sessionQuery.is("dossier_approved_at", null);
  }

  const { data: sessions, count: totalCount } = await sessionQuery;
  if (!sessions || sessions.length === 0) return empty;

  const sessionIds = sessions.map((s) => s.id);

  // 3. Contar respostas por sessão e outcome em uma única query
  const { data: responseRows } = await supabase
    .from("checklist_fill_item_responses")
    .select("session_id, outcome")
    .in("session_id", sessionIds);

  type OutcomeCounts = { conforme: number; nc: number; na: number };
  const countsBySession = new Map<string, OutcomeCounts>();
  for (const r of responseRows ?? []) {
    const sid = r.session_id;
    const cur = countsBySession.get(sid) ?? { conforme: 0, nc: 0, na: 0 };
    if (r.outcome === "conforme") cur.conforme++;
    else if (r.outcome === "nc") cur.nc++;
    else if (r.outcome === "na") cur.na++;
    countsBySession.set(sid, cur);
  }

  // 4. Coletar template IDs únicos para buscar nomes e total de itens
  const templateIds = [...new Set(sessions.map((s) => s.template_id).filter(Boolean))] as string[];
  const customTemplateIds = [...new Set(sessions.map((s) => s.custom_template_id).filter(Boolean))] as string[];

  // Nomes de templates globais
  const templateNameMap = new Map<string, { name: string; portaria_ref: string }>();
  if (templateIds.length > 0) {
    const { data: tRows } = await supabase
      .from("checklist_templates")
      .select("id, name, portaria_ref")
      .in("id", templateIds);
    for (const t of tRows ?? []) {
      templateNameMap.set(t.id, { name: t.name, portaria_ref: t.portaria_ref });
    }
  }

  // Nomes de templates personalizados
  const customTemplateNameMap = new Map<string, string>();
  if (customTemplateIds.length > 0) {
    const { data: ctRows } = await supabase
      .from("checklist_custom_templates")
      .select("id, name")
      .in("id", customTemplateIds);
    for (const ct of ctRows ?? []) {
      customTemplateNameMap.set(ct.id, ct.name);
    }
  }

  // 5. Total de itens por template global (via sections → items)
  const templateTotalItemsMap = new Map<string, number>();
  if (templateIds.length > 0) {
    const { data: secRows } = await supabase
      .from("checklist_template_sections")
      .select("id, template_id")
      .in("template_id", templateIds);

    const sectionToTemplate = new Map<string, string>();
    for (const s of secRows ?? []) {
      sectionToTemplate.set(s.id, s.template_id);
    }

    if (sectionToTemplate.size > 0) {
      const { data: itemRows } = await supabase
        .from("checklist_template_items")
        .select("id, section_id")
        .in("section_id", [...sectionToTemplate.keys()]);

      for (const item of itemRows ?? []) {
        const tid = sectionToTemplate.get(item.section_id);
        if (tid) {
          templateTotalItemsMap.set(tid, (templateTotalItemsMap.get(tid) ?? 0) + 1);
        }
      }
    }
  }

  // Total de itens por template personalizado
  const customTemplateTotalItemsMap = new Map<string, number>();
  if (customTemplateIds.length > 0) {
    const { data: cSecRows } = await supabase
      .from("checklist_custom_sections")
      .select("id, custom_template_id")
      .in("custom_template_id", customTemplateIds);

    const cSectionToTemplate = new Map<string, string>();
    for (const s of cSecRows ?? []) {
      cSectionToTemplate.set(s.id, s.custom_template_id as string);
    }

    if (cSectionToTemplate.size > 0) {
      const { data: cItemRows } = await supabase
        .from("checklist_custom_items")
        .select("id, custom_section_id")
        .in("custom_section_id", [...cSectionToTemplate.keys()]);

      for (const item of cItemRows ?? []) {
        const ctid = cSectionToTemplate.get(item.custom_section_id as string);
        if (ctid) {
          customTemplateTotalItemsMap.set(ctid, (customTemplateTotalItemsMap.get(ctid) ?? 0) + 1);
        }
      }
    }
  }

  // 6. Montar resultados
  const rows: ChecklistSessionSummary[] = sessions.map((sess) => {
    const est = estMap.get(sess.establishment_id) ?? {
      name: "Estabelecimento",
      establishment_type: "outros" as EstablishmentType,
    };
    const counts = countsBySession.get(sess.id) ?? { conforme: 0, nc: 0, na: 0 };

    let templateName = "—";
    let portariaRef: string | null = null;
    let totalItems = 0;

    if (sess.template_id) {
      const tInfo = templateNameMap.get(sess.template_id);
      templateName = tInfo?.name ?? "Template";
      portariaRef = tInfo?.portaria_ref ?? null;
      totalItems = templateTotalItemsMap.get(sess.template_id) ?? 0;
    } else if (sess.custom_template_id) {
      templateName = customTemplateNameMap.get(sess.custom_template_id) ?? "Template personalizado";
      totalItems = customTemplateTotalItemsMap.get(sess.custom_template_id) ?? 0;
    }

    const answeredCount = counts.conforme + counts.nc + counts.na;
    const pendingCount = Math.max(0, totalItems - answeredCount);
    const startedByLabel = sess.user_id === user.id ? ownUserLabel : "Membro da equipe";

    return {
      id: sess.id,
      started_by_label: startedByLabel,
      created_at: sess.created_at,
      updated_at: sess.updated_at,
      dossier_approved_at: sess.dossier_approved_at ?? null,
      status: sess.dossier_approved_at ? "aprovado" : "em_andamento",
      template_name: templateName,
      portaria_ref: portariaRef,
      establishment_id: sess.establishment_id,
      establishment_name: est.name,
      establishment_type: est.establishment_type,
      conformant_count: counts.conforme,
      nc_count: counts.nc,
      na_count: counts.na,
      pending_count: pendingCount,
      total_items: totalItems,
    };
  });

  return { rows, total: totalCount ?? rows.length };
}

/* ─── E.2: loadChecklistSessionNcItems ─────────────────────────────────── */

/**
 * Carrega os itens em não conformidade de uma sessão de preenchimento.
 * Valida ownership via join establishments → clients → owner_user_id.
 * Usado no lazy-load ao expandir um card de histórico.
 */
export async function loadChecklistSessionNcItems(
  sessionId: string,
): Promise<NcItemDetail[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // VALIDAÇÃO: verificar que a sessão pertence a um estabelecimento de um cliente do usuário.
  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, establishment_id, template_id, custom_template_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return [];

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", sess.establishment_id)
    .maybeSingle();

  if (!est) return [];

  const owned = await assertClientOwned(supabase, user.id, est.client_id as string);
  if (!owned) return [];

  // Buscar respostas NC desta sessão
  const { data: ncResponses } = await supabase
    .from("checklist_fill_item_responses")
    .select("id, template_item_id, custom_item_id, note, item_annotation")
    .eq("session_id", sessionId)
    .eq("outcome", "nc");

  if (!ncResponses || ncResponses.length === 0) return [];

  const result: NcItemDetail[] = [];

  const globalItemIds = ncResponses
    .filter((r) => r.template_item_id)
    .map((r) => r.template_item_id as string);

  const customItemIds = ncResponses
    .filter((r) => r.custom_item_id)
    .map((r) => r.custom_item_id as string);

  // Buscar detalhes de itens globais
  const globalItemMap = new Map<string, { description: string; is_required: boolean }>();
  if (globalItemIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("checklist_template_items")
      .select("id, description, is_required")
      .in("id", globalItemIds);
    for (const it of itemRows ?? []) {
      globalItemMap.set(it.id, {
        description: it.description,
        is_required: Boolean(it.is_required),
      });
    }
  }

  // Buscar detalhes de itens personalizados
  const customItemMap = new Map<string, { description: string; is_required: boolean }>();
  if (customItemIds.length > 0) {
    const { data: cItemRows } = await supabase
      .from("checklist_custom_items")
      .select("id, description, is_required")
      .in("id", customItemIds);
    for (const it of cItemRows ?? []) {
      customItemMap.set(it.id, {
        description: it.description,
        is_required: Boolean(it.is_required),
      });
    }
  }

  // Montar resultado
  for (const r of ncResponses) {
    const itemInfo = r.template_item_id
      ? globalItemMap.get(r.template_item_id)
      : r.custom_item_id
        ? customItemMap.get(r.custom_item_id)
        : null;

    if (!itemInfo) continue;

    result.push({
      item_id: (r.template_item_id ?? r.custom_item_id) as string,
      description: itemInfo.description,
      is_required: itemInfo.is_required,
      note: (r.note as string | null) ?? null,
      item_annotation: (r.item_annotation as string | null) ?? null,
    });
  }

  return result;
}
