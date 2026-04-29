"use server";

import { revalidatePath } from "next/cache";

import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillSessionReopenEventRow } from "@/lib/types/checklist-reopen";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
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

  return Boolean(cl && cl.owner_user_id === workspaceOwnerId);
}

function formatReopenAuditFailure(err: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const msg = String(err.message ?? "").trim();
  const hint = String(err.hint ?? "").trim();
  const code = err.code ?? "";

  /** PostgREST PGRST205 / Postgres 42P01: tabela ausente ou não exposta ao API. */
  const tableMissing =
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("Could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    hint.includes("Perhaps you meant");

  if (tableMissing) {
    return (
      "A base de dados ainda não tem a tabela de auditoria de reaberturas (checklist_fill_session_reopen_events). " +
      "No projeto local, execute: npx supabase db push (ou aplique manualmente os ficheiros em supabase/migrations " +
      "que começam por 20260629120000, 20260629200000 e 20260629210000 no Dashboard SQL do Supabase ligado à app)."
    );
  }
  if (code === "23514" || msg.includes("checklist_fill_session_reopen_events_role_check")) {
    return "Papel inválido na auditoria. Confirme migrações e perfil (titular, admin ou Gestão).";
  }
  if (msg.includes("row-level security") || msg.includes("violates row-level security")) {
    return "Sem permissão para registar a auditoria (RLS). Confirme migrações e que é titular, administrador ou Gestão.";
  }
  const tail =
    [err.details, err.hint].filter(Boolean).join(" ") ||
    (msg.length > 0 ? msg : "Erro desconhecido ao gravar auditoria.");
  return `Não foi possível registar a auditoria da reabertura. ${tail}`;
}

async function resolveActorDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceOwnerId: string,
): Promise<string> {
  const { data: p } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  const fromProfile = String(p?.full_name ?? "").trim();
  if (fromProfile) return fromProfile;

  const { data: tm } = await supabase
    .from("team_members")
    .select("full_name")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("member_user_id", userId)
    .maybeSingle();
  const fromTeam = String(tm?.full_name ?? "").trim();
  return fromTeam || "Utilizador";
}

export async function getChecklistReopenEligibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
): Promise<{ canReopen: boolean; actorRole: "owner" | "admin" | "gestao" | null }> {
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, authUserId);
  if (authUserId === workspaceOwnerId) {
    return { canReopen: true, actorRole: "owner" };
  }
  const { data: p } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (p?.role === "admin") {
    return { canReopen: true, actorRole: "admin" };
  }
  const { data: gestaoMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("member_user_id", authUserId)
    .eq("job_role", "gestao")
    .maybeSingle();
  if (gestaoMember) {
    return { canReopen: true, actorRole: "gestao" };
  }
  return { canReopen: false, actorRole: null };
}

export async function loadReopenEventsForSession(
  sessionId: string,
): Promise<ChecklistFillSessionReopenEventRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("checklist_fill_session_reopen_events")
    .select(
      "id, session_id, reopened_by_label, reopened_by_role, justification, previous_approved_at, created_at",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as ChecklistFillSessionReopenEventRow[];
}

export type ReopenChecklistDossierResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Reabre um checklist já finalizado (dossiê aprovado): zera score, marca PDFs como obsoletos,
 * regista justificativa para auditoria. Titular, perfil `admin` ou cargo Gestão na equipa.
 */
export async function reopenChecklistFillDossierAction(
  sessionId: string,
  justification: string,
): Promise<ReopenChecklistDossierResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const trimmed = justification.trim();
  if (trimmed.length < 10) {
    return {
      ok: false,
      error: "A justificativa deve ter pelo menos 10 caracteres.",
    };
  }

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) return { ok: false, error: "Sessão não encontrada." };
  if (!bundle.session.dossier_approved_at) {
    return { ok: false, error: "Este checklist não está finalizado." };
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const estOk = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    bundle.session.establishment_id as string,
  );
  if (!estOk) return { ok: false, error: "Sem permissão para esta sessão." };

  const { canReopen, actorRole } = await getChecklistReopenEligibility(supabase, user.id);
  if (!canReopen || !actorRole) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta, um administrador ou um membro com cargo Gestão pode reabrir um checklist finalizado.",
    };
  }

  const prevApproved = bundle.session.dossier_approved_at as string;
  const prevScoreRaw =
    bundle.session.score_percentage === null || bundle.session.score_percentage === undefined
      ? null
      : Number(bundle.session.score_percentage);
  const prevScore =
    prevScoreRaw !== null && Number.isFinite(prevScoreRaw) ? prevScoreRaw : null;

  const reopenedByLabel = await resolveActorDisplayName(supabase, user.id, workspaceOwnerId);

  const { error: auditInsertErr } = await supabase
    .from("checklist_fill_session_reopen_events")
    .insert({
      session_id: sessionId,
      owner_user_id: workspaceOwnerId,
      reopened_by_user_id: user.id,
      reopened_by_label: reopenedByLabel,
      reopened_by_role: actorRole,
      justification: trimmed,
      previous_approved_at: prevApproved,
      previous_score_percentage: prevScore,
    });

  if (auditInsertErr) {
    console.error(
      "[reopenChecklistFillDossierAction] audit insert failed",
      JSON.stringify(auditInsertErr, null, 0),
    );
    return { ok: false, error: formatReopenAuditFailure(auditInsertErr) };
  }

  const { data: auditRow, error: auditSelectErr } = await supabase
    .from("checklist_fill_session_reopen_events")
    .select("id")
    .eq("session_id", sessionId)
    .eq("reopened_by_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (auditSelectErr) {
    console.error(
      "[reopenChecklistFillDossierAction] audit select after insert failed",
      JSON.stringify(auditSelectErr, null, 0),
    );
    return { ok: false, error: formatReopenAuditFailure(auditSelectErr) };
  }

  if (!auditRow?.id) {
    console.error("[reopenChecklistFillDossierAction] audit row missing after insert", {
      sessionId,
      userId: user.id,
    });
    return {
      ok: false,
      error:
        "Não foi possível confirmar o registo de auditoria. Recarregue a página e tente outra vez; se persistir, aplique as migrações Supabase.",
    };
  }

  const { data: updated, error: updErr } = await supabase
    .from("checklist_fill_sessions")
    .update({
      dossier_approved_at: null,
      score_percentage: null,
      score_points_earned: null,
      score_points_total: null,
    })
    .eq("id", sessionId)
    .not("dossier_approved_at", "is", null)
    .select("id")
    .maybeSingle();

  if (updErr || !updated) {
    await supabase
      .from("checklist_fill_session_reopen_events")
      .delete()
      .eq("id", auditRow.id as string);
    return {
      ok: false,
      error: "Não foi possível reabrir o checklist (o estado pode ter mudado).",
    };
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("checklist_fill_pdf_exports")
    .update({ superseded_at: nowIso })
    .eq("session_id", sessionId)
    .eq("status", "ready")
    .is("superseded_at", null);

  const visitId = bundle.session.scheduled_visit_id;
  if (visitId) {
    await supabase
      .from("scheduled_visits")
      .update({ status: "in_progress" })
      .eq("id", visitId)
      .eq("status", "completed");
  }

  revalidatePath(`/checklists/preencher/${sessionId}`);
  if (visitId) {
    const vid = String(visitId);
    revalidatePath(`/visitas/${vid}`);
    revalidatePath(`/visitas/${vid}/iniciar`);
  }
  revalidatePath("/visitas");
  revalidatePath("/inicio");

  return { ok: true };
}
