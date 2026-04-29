"use server";

import { revalidatePath } from "next/cache";

import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import { buildChecklistDossierPdfFilename } from "@/lib/checklist-dossier-pdf-filename";
import { buildApprovedDossierPdfBytes } from "@/lib/pdf/build-approved-dossier-pdf";
import { sendDossierPdfViaResend } from "@/lib/email/send-dossier-email-resend";
import { createClient } from "@/lib/supabase/server";
import { getLatestFillSessionIdForVisit } from "@/lib/actions/visit-checklist";
import type { ChecklistFillSessionRow } from "@/lib/types/checklist-fill";
import { collectValidUniqueEmails } from "@/lib/validators/dossier-email-recipients";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

function truncateErr(msg: string, max = 480): string {
  const t = msg.trim();
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
}

async function persistVisitEmailStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  status: "sent" | "failed",
  errorMessage: string | null,
): Promise<void> {
  const patch =
    status === "sent"
      ? {
          dossier_email_send_status: "sent" as const,
          dossier_email_last_error: null,
          dossier_email_sent_at: new Date().toISOString(),
        }
      : {
          dossier_email_send_status: "failed" as const,
          dossier_email_last_error: errorMessage
            ? truncateErr(errorMessage)
            : "Falha desconhecida.",
        };

  await supabase.from("scheduled_visits").update(patch).eq("id", visitId);
}

/**
 * Chamado após aprovação do dossiê (ex.: via `after()`): envia PDF se houver destinatários e Resend configurado.
 */
export async function trySendDossierEmailAfterApprove(
  visitId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (!process.env.RESEND_API_KEY?.trim()) return;

  const { data: visit } = await supabase
    .from("scheduled_visits")
    .select("id, dossier_recipient_emails")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return;

  const recipients = (visit.dossier_recipient_emails ?? []) as string[];
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle?.session.dossier_approved_at) return;

  if (bundle.session.scheduled_visit_id !== visitId) return;

  try {
    const bytes = await buildApprovedDossierPdfBytes(
      supabase,
      bundle.session.user_id,
      {
      sessionId,
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      clientLabel: bundle.pdfClientLabel,
      areaName: bundle.areaName,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
      itemPhotos: bundle.itemPhotos,
      },
    );

    const attachmentFilename = buildChecklistDossierPdfFilename({
      clientLabel: bundle.pdfClientLabel,
      areaLabel: bundle.areaName?.trim() || "sem_area",
      approvalIso: bundle.session.dossier_approved_at as string,
      duplicateIndex: 0,
    });

    const sent = await sendDossierPdfViaResend({
      to: recipients,
      subjectEstablishmentLine: bundle.establishmentLabel,
      pdfBytes: bytes,
      attachmentFilename,
    });

    if (sent.ok) {
      await persistVisitEmailStatus(supabase, visitId, "sent", null);
    } else {
      await persistVisitEmailStatus(supabase, visitId, "failed", sent.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persistVisitEmailStatus(supabase, visitId, "failed", msg);
  }

  revalidatePath(`/visitas/${visitId}`);
  revalidatePath(`/visitas/${visitId}/iniciar`);
  revalidatePath(`/checklists/preencher/${sessionId}`);
  revalidatePath("/visitas");
  revalidatePath("/inicio");
}

export type ResendDossierEmailResult =
  | { ok: true }
  | { ok: false; error: string };

/** Reenvio manual a partir da ficha da visita. */
export async function resendDossierEmailAction(
  visitId: string,
): Promise<ResendDossierEmailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: visit } = await supabase
    .from("scheduled_visits")
    .select("id, dossier_recipient_emails")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visita não encontrada." };

  const recipients = (visit.dossier_recipient_emails ?? []) as string[];
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ok: false, error: "Indique pelo menos um email na visita." };
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return {
      ok: false,
      error: "Envio por email não está configurado no servidor (RESEND_API_KEY).",
    };
  }

  const sessionId =
    (await getLatestFillSessionIdForVisit(visitId)) ??
    null;
  if (!sessionId) {
    return { ok: false, error: "Não há checklist associado a esta visita." };
  }

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle?.session.dossier_approved_at) {
    return { ok: false, error: "O dossiê ainda não foi aprovado." };
  }

  try {
    const bytes = await buildApprovedDossierPdfBytes(
      supabase,
      bundle.session.user_id,
      {
      sessionId,
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      clientLabel: bundle.pdfClientLabel,
      areaName: bundle.areaName,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
      itemPhotos: bundle.itemPhotos,
      },
    );

    const attachmentFilenameResend = buildChecklistDossierPdfFilename({
      clientLabel: bundle.pdfClientLabel,
      areaLabel: bundle.areaName?.trim() || "sem_area",
      approvalIso: bundle.session.dossier_approved_at as string,
      duplicateIndex: 0,
    });

    const sent = await sendDossierPdfViaResend({
      to: recipients,
      subjectEstablishmentLine: bundle.establishmentLabel,
      pdfBytes: bytes,
      attachmentFilename: attachmentFilenameResend,
    });

    if (!sent.ok) {
      await persistVisitEmailStatus(supabase, visitId, "failed", sent.error);
      revalidatePath(`/visitas/${visitId}`);
      return { ok: false, error: sent.error };
    }

    await persistVisitEmailStatus(supabase, visitId, "sent", null);
    revalidatePath(`/visitas/${visitId}`);
    revalidatePath(`/visitas/${visitId}/iniciar`);
    revalidatePath(`/checklists/preencher/${sessionId}`);
    revalidatePath("/visitas");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persistVisitEmailStatus(supabase, visitId, "failed", msg);
    revalidatePath(`/visitas/${visitId}`);
    return { ok: false, error: truncateErr(msg) };
  }
}

async function assertEstablishmentOwnedByWorkspace(
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

async function resolveDossierPdfEmailRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: ChecklistFillSessionRow,
): Promise<{ ok: true; to: string[] } | { ok: false; error: string }> {
  const visitId = session.scheduled_visit_id;
  if (visitId) {
    const { data: visit } = await supabase
      .from("scheduled_visits")
      .select("dossier_recipient_emails")
      .eq("id", visitId)
      .maybeSingle();
    const arr = (visit?.dossier_recipient_emails ?? []) as string[];
    const fromVisit = collectValidUniqueEmails(arr);
    if (fromVisit.length > 0) {
      return { ok: true, to: fromVisit };
    }
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", session.establishment_id)
    .maybeSingle();
  if (!est) return { ok: false, error: "Estabelecimento não encontrado." };

  const { data: client } = await supabase
    .from("clients")
    .select("email, legal_rep_email, technical_rep_email, guardian_email, kind")
    .eq("id", est.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  const pool: (string | null | undefined)[] = [
    client.email,
    client.legal_rep_email,
    client.technical_rep_email,
  ];
  if (client.kind === "pf") {
    pool.push(client.guardian_email);
  }

  const to = collectValidUniqueEmails(pool);
  if (to.length === 0) {
    return {
      ok: false,
      error: visitId
        ? "Não há emails: adicione destinatários na visita ou no cadastro do cliente."
        : "Não há email no cadastro do cliente. Adicione um contacto no cliente.",
    };
  }
  return { ok: true, to };
}

export type SendDossierPdfToClientResult =
  | { ok: true }
  | { ok: false; error: string };

/** Envia o PDF do dossié aprovado para emails do cliente (visita e/ou cadastro). */
export async function sendDossierPdfToClientFromSessionAction(
  sessionId: string,
): Promise<SendDossierPdfToClientResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  if (!process.env.RESEND_API_KEY?.trim()) {
    return {
      ok: false,
      error: "Envio por email não está configurado no servidor (RESEND_API_KEY).",
    };
  }
  if (
    !process.env.DOSSIER_EMAIL_FROM?.trim() &&
    !process.env.RESEND_FROM_EMAIL?.trim()
  ) {
    return {
      ok: false,
      error:
        "Remetente de email não configurado (DOSSIER_EMAIL_FROM ou RESEND_FROM_EMAIL).",
    };
  }

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) return { ok: false, error: "Sessão não encontrada." };
  if (!bundle.session.dossier_approved_at) {
    return { ok: false, error: "Apenas dossiés aprovados podem ser enviados." };
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const owned = await assertEstablishmentOwnedByWorkspace(
    supabase,
    workspaceOwnerId,
    bundle.session.establishment_id,
  );
  if (!owned) return { ok: false, error: "Sem permissão." };

  const rec = await resolveDossierPdfEmailRecipients(
    supabase,
    bundle.session,
  );
  if (!rec.ok) return { ok: false, error: rec.error };

  const visitIdForStatus = bundle.session.scheduled_visit_id;

  try {
    const bytes = await buildApprovedDossierPdfBytes(
      supabase,
      bundle.session.user_id,
      {
      sessionId,
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      clientLabel: bundle.pdfClientLabel,
      areaName: bundle.areaName,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
      itemPhotos: bundle.itemPhotos,
      },
    );

    const attachmentFilenameSession = buildChecklistDossierPdfFilename({
      clientLabel: bundle.pdfClientLabel,
      areaLabel: bundle.areaName?.trim() || "sem_area",
      approvalIso: bundle.session.dossier_approved_at as string,
      duplicateIndex: 0,
    });

    const sent = await sendDossierPdfViaResend({
      to: rec.to,
      subjectEstablishmentLine: bundle.establishmentLabel,
      pdfBytes: bytes,
      attachmentFilename: attachmentFilenameSession,
    });

    if (!sent.ok) {
      if (visitIdForStatus) {
        await persistVisitEmailStatus(
          supabase,
          visitIdForStatus,
          "failed",
          sent.error,
        );
        revalidatePath(`/visitas/${visitIdForStatus}`);
      }
      revalidatePath(`/checklists/preencher/${sessionId}`);
      return { ok: false, error: sent.error };
    }

    if (visitIdForStatus) {
      await persistVisitEmailStatus(supabase, visitIdForStatus, "sent", null);
      revalidatePath(`/visitas/${visitIdForStatus}`);
      revalidatePath(`/visitas/${visitIdForStatus}/iniciar`);
    }
    revalidatePath(`/checklists/preencher/${sessionId}`);
    revalidatePath("/visitas");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (visitIdForStatus) {
      await persistVisitEmailStatus(
        supabase,
        visitIdForStatus,
        "failed",
        truncateErr(msg),
      );
      revalidatePath(`/visitas/${visitIdForStatus}`);
    }
    revalidatePath(`/checklists/preencher/${sessionId}`);
    return { ok: false, error: truncateErr(msg) };
  }
}
