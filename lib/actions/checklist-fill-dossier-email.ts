"use server";

import { revalidatePath } from "next/cache";

import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import { buildApprovedDossierPdfBytes } from "@/lib/pdf/build-approved-dossier-pdf";
import { sendDossierPdfViaResend } from "@/lib/email/send-dossier-email-resend";
import { createClient } from "@/lib/supabase/server";
import { getLatestFillSessionIdForVisit } from "@/lib/actions/visit-checklist";

function truncateErr(msg: string, max = 480): string {
  const t = msg.trim();
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
}

async function persistVisitEmailStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
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

  await supabase
    .from("scheduled_visits")
    .update(patch)
    .eq("id", visitId)
    .eq("user_id", userId);
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
    .select("id, user_id, dossier_recipient_emails")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!visit) return;

  const recipients = (visit.dossier_recipient_emails ?? []) as string[];
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle?.session.dossier_approved_at) return;

  if (bundle.session.scheduled_visit_id !== visitId) return;

  try {
    const bytes = await buildApprovedDossierPdfBytes(supabase, user.id, {
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
    });

    const sent = await sendDossierPdfViaResend({
      to: recipients,
      subjectEstablishmentLine: bundle.establishmentLabel,
      pdfBytes: bytes,
      attachmentFilename: "dossie-checklist.pdf",
    });

    if (sent.ok) {
      await persistVisitEmailStatus(supabase, user.id, visitId, "sent", null);
    } else {
      await persistVisitEmailStatus(supabase, user.id, visitId, "failed", sent.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persistVisitEmailStatus(supabase, user.id, visitId, "failed", msg);
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
    .select("id, user_id, dossier_recipient_emails")
    .eq("id", visitId)
    .eq("user_id", user.id)
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
    const bytes = await buildApprovedDossierPdfBytes(supabase, user.id, {
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
    });

    const sent = await sendDossierPdfViaResend({
      to: recipients,
      subjectEstablishmentLine: bundle.establishmentLabel,
      pdfBytes: bytes,
      attachmentFilename: "dossie-checklist.pdf",
    });

    if (!sent.ok) {
      await persistVisitEmailStatus(supabase, user.id, visitId, "failed", sent.error);
      revalidatePath(`/visitas/${visitId}`);
      return { ok: false, error: sent.error };
    }

    await persistVisitEmailStatus(supabase, user.id, visitId, "sent", null);
    revalidatePath(`/visitas/${visitId}`);
    revalidatePath(`/visitas/${visitId}/iniciar`);
    revalidatePath(`/checklists/preencher/${sessionId}`);
    revalidatePath("/visitas");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persistVisitEmailStatus(supabase, user.id, visitId, "failed", msg);
    revalidatePath(`/visitas/${visitId}`);
    return { ok: false, error: truncateErr(msg) };
  }
}
