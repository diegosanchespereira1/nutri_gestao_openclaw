"use server";

import { revalidatePath } from "next/cache";

import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import {
  CHECKLIST_DOSSIER_PDFS_BUCKET,
  CHECKLIST_DOSSIER_PDF_SIGNED_URL_SEC,
} from "@/lib/constants/checklist-dossier-pdf";
import { buildApprovedDossierPdfBytes } from "@/lib/pdf/build-approved-dossier-pdf";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillPdfExportRow } from "@/lib/types/checklist-fill-pdf";

function safeErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 480 ? `${m.slice(0, 477)}...` : m;
}

export type GenerateDossierPdfResult =
  | { ok: true; job: ChecklistFillPdfExportRow; downloadUrl: string }
  | { ok: false; error: string };

export type DownloadDossierPdfResult =
  | { ok: true; downloadUrl: string }
  | { ok: false; error: string };

export async function generateDossierPdfAction(
  sessionId: string,
): Promise<GenerateDossierPdfResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) return { ok: false, error: "Sessão não encontrada." };

  if (!bundle.session.dossier_approved_at) {
    return {
      ok: false,
      error: "Apenas dossiés aprovados podem ser exportados em PDF.",
    };
  }

  const { data: job, error: insErr } = await supabase
    .from("checklist_fill_pdf_exports")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      status: "processing",
    })
    .select("id, user_id, session_id, status, storage_path, error_message, created_at, updated_at")
    .single();

  if (insErr || !job) {
    return { ok: false, error: "Não foi possível iniciar a exportação." };
  }

  const jobId = job.id as string;
  const storagePath = `${user.id}/${sessionId}/${jobId}.pdf`;

  try {
    const bytes = await buildApprovedDossierPdfBytes(supabase, user.id, {
      template: bundle.template,
      responses: bundle.responses,
      establishmentLabel: bundle.establishmentLabel,
      dossierApprovedAtIso: bundle.session.dossier_approved_at as string,
    });

    const { error: upErr } = await supabase.storage
      .from(CHECKLIST_DOSSIER_PDFS_BUCKET)
      .upload(storagePath, Buffer.from(bytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      throw new Error(upErr.message);
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(CHECKLIST_DOSSIER_PDFS_BUCKET)
      .createSignedUrl(storagePath, CHECKLIST_DOSSIER_PDF_SIGNED_URL_SEC);

    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "URL de transferência indisponível.");
    }

    const { data: updated, error: updErr } = await supabase
      .from("checklist_fill_pdf_exports")
      .update({
        status: "ready",
        storage_path: storagePath,
        error_message: null,
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
      .select("id, user_id, session_id, status, storage_path, error_message, created_at, updated_at")
      .single();

    if (updErr || !updated) {
      throw new Error(updErr?.message ?? "Falha ao registar o PDF.");
    }

    revalidatePath(`/checklists/preencher/${sessionId}`);
    const vid = bundle.session.scheduled_visit_id;
    if (vid) {
      const id = String(vid);
      revalidatePath(`/visitas/${id}`);
      revalidatePath(`/visitas/${id}/iniciar`);
    }

    return {
      ok: true,
      job: updated as ChecklistFillPdfExportRow,
      downloadUrl: signed.signedUrl,
    };
  } catch (e) {
    const msg = safeErr(e);
    await supabase
      .from("checklist_fill_pdf_exports")
      .update({
        status: "failed",
        error_message: msg,
        storage_path: null,
      })
      .eq("id", jobId)
      .eq("user_id", user.id);

    revalidatePath(`/checklists/preencher/${sessionId}`);

    return { ok: false, error: msg };
  }
}

export async function downloadDossierPdfAction(
  jobId: string,
): Promise<DownloadDossierPdfResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: row } = await supabase
    .from("checklist_fill_pdf_exports")
    .select("id, user_id, status, storage_path, session_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row || row.status !== "ready" || !row.storage_path) {
    return { ok: false, error: "PDF não disponível. Gere novamente." };
  }

  const { data: signed, error } = await supabase.storage
    .from(CHECKLIST_DOSSIER_PDFS_BUCKET)
    .createSignedUrl(
      row.storage_path as string,
      CHECKLIST_DOSSIER_PDF_SIGNED_URL_SEC,
    );

  if (error || !signed?.signedUrl) {
    return { ok: false, error: "Não foi possível obter o link de transferência." };
  }

  return { ok: true, downloadUrl: signed.signedUrl };
}
