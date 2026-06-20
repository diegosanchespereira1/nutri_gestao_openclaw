import type { SupabaseClient } from "@supabase/supabase-js";

import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";
import { TENANT_LOGOS_BUCKET } from "@/lib/constants/tenant-logos-storage";
import { fetchTenantLogoStoragePath } from "@/lib/tenant/logo-sync";
import {
  buildDossierPdfBytes,
  foldTextForPdf,
  normalizeCrnForPdf,
} from "@/lib/pdf/dossier-pdf";
import { DEFAULT_PDF_SETTINGS } from "@/lib/constants/checklist-pdf-settings";
import { formatDossierApprovalAuditLine } from "@/lib/checklists/dossier-approval-metadata";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

export function formatApprovedAtForDossierPdf(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "long",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export type ApprovedDossierPdfBundleInput = {
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  establishmentLabel: string;
  dossierApprovedAtIso: string;
  itemPhotos?: Record<string, ChecklistFillPhotoView[]>;
  /** Rótulo "limpo" do cliente (fallback: extraído do establishmentLabel). */
  clientLabel?: string;
  /** Nome da área avaliada (quando aplicável). */
  areaName?: string | null;
  /** Data URL PNG da assinatura da profissional (capturada na aprovação do dossiê). */
  professionalSignatureDataUrl?: string | null;
  /** Data URL PNG da assinatura do cliente/responsável (capturada na aprovação do dossiê). */
  clientSignatureDataUrl?: string | null;
  /** Nome digitado pelo signatário do cliente no momento da aprovação. */
  clientSignerName?: string | null;
  /** Hash SHA-256 hex único desta versão aprovada do dossiê. */
  documentHash?: string | null;
  /** IP do dispositivo no momento da aprovação. */
  dossierApprovedClientIp?: string | null;
};

async function loadProfessionalIdentity(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ fullName: string; crn: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn")
    .eq("user_id", userId)
    .maybeSingle();

  const profileFullName = String(profile?.full_name ?? "").trim();
  const profileCrn = String(profile?.crn ?? "").trim();
  if (profileFullName.length > 0 && profileCrn.length > 0) {
    return { fullName: profileFullName, crn: profileCrn };
  }

  // Fallback para membro da equipe: alguns utilizadores preenchem CRN apenas no registo
  // de team member, então usamos este valor para não gerar PDF com CRN em branco.
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, crn")
    .eq("member_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const memberFullName = String(member?.full_name ?? "").trim();
  const memberCrn = String(member?.crn ?? "").trim();

  return {
    fullName: profileFullName || memberFullName,
    crn: profileCrn || memberCrn,
  };
}

async function downloadSignedAsset(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (e) {
    console.error("Erro ao baixar asset para PDF:", e);
    return null;
  }
}

async function loadTenantLogoBuffer(
  supabase: SupabaseClient,
): Promise<Buffer | null> {
  const path = await fetchTenantLogoStoragePath(supabase);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(TENANT_LOGOS_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return null;

  return downloadSignedAsset(data.signedUrl);
}

async function loadPdfSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ headerBgColor: string; headerTextColor: string; accentColor: string }> {
  try {
    const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, userId);
    const { data } = await supabase
      .from("checklist_pdf_settings")
      .select("header_bg_color, header_text_color, accent_color")
      .eq("workspace_owner_id", workspaceOwnerId)
      .maybeSingle();

    if (!data) return { ...DEFAULT_PDF_SETTINGS };

    return {
      headerBgColor:   String(data.header_bg_color   ?? DEFAULT_PDF_SETTINGS.headerBgColor),
      headerTextColor: String(data.header_text_color ?? DEFAULT_PDF_SETTINGS.headerTextColor),
      accentColor:     String(data.accent_color      ?? DEFAULT_PDF_SETTINGS.accentColor),
    };
  } catch {
    // best-effort: retorna padrão se a migration ainda não foi aplicada
    return { ...DEFAULT_PDF_SETTINGS };
  }
}

type SessionScore = {
  percentage: number;
  pointsEarned: number;
  pointsTotal: number;
} | null;

async function loadSessionScore(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SessionScore> {
  const { data } = await supabase
    .from("checklist_fill_sessions")
    .select("score_percentage, score_points_earned, score_points_total")
    .eq("id", sessionId)
    .maybeSingle();

  const pct = data?.score_percentage;
  const earned = data?.score_points_earned;
  const total = data?.score_points_total;

  if (
    typeof pct === "number" &&
    Number.isFinite(pct) &&
    typeof earned === "number" &&
    typeof total === "number"
  ) {
    return {
      percentage: Math.round(pct),
      pointsEarned: Number(earned),
      pointsTotal: Number(total),
    };
  }
  return null;
}

function computeScoreFromTemplate(
  template: ChecklistTemplateWithSections,
  responses: FillResponsesMap,
): SessionScore {
  let earned = 0;
  let total = 0;
  for (const sec of template.sections) {
    for (const item of sec.items) {
      if (isStructureOnlyItem(item)) continue;
      const r = responses[item.id];
      if (!r?.outcome || r.outcome === "na") continue;
      const w = item.peso ?? 1;
      total += w;
      if (r.outcome === "conforme") earned += w;
    }
  }
  if (total <= 0) return null;
  return {
    percentage: Math.round((earned / total) * 100),
    pointsEarned: earned,
    pointsTotal: total,
  };
}

function extractClientLabel(establishmentLabel: string): string {
  const sep = " — ";
  const idx = establishmentLabel.indexOf(sep);
  if (idx > -1) return establishmentLabel.slice(idx + sep.length).trim();
  return establishmentLabel;
}

export async function buildApprovedDossierPdfBytes(
  supabase: SupabaseClient,
  userId: string,
  input: ApprovedDossierPdfBundleInput & { sessionId?: string },
): Promise<Uint8Array> {
  const [professional, logoBuffer, pdfSettings] = await Promise.all([
    loadProfessionalIdentity(supabase, userId),
    loadTenantLogoBuffer(supabase),
    loadPdfSettings(supabase, userId),
  ]);

  const professionalName = foldTextForPdf(
    professional.fullName || "Profissional",
  );
  const crn = normalizeCrnForPdf(professional.crn);

  let score: SessionScore = null;
  if (input.sessionId) {
    score = await loadSessionScore(supabase, input.sessionId);
  }
  if (!score) {
    score = computeScoreFromTemplate(input.template, input.responses);
  }

  const clientLabel = input.clientLabel ?? extractClientLabel(input.establishmentLabel);

  // Converte data URL de assinatura (base64 PNG) em Buffer para o PDF
  function dataUrlToBuffer(dataUrl: string | null | undefined): Buffer | null {
    if (!dataUrl) return null;
    const match = dataUrl.match(/^data:image\/(?:png|jpeg|webp);base64,(.+)$/);
    if (!match?.[1]) return null;
    try {
      return Buffer.from(match[1], "base64");
    } catch {
      return null;
    }
  }

  const professionalSignatureBuffer = dataUrlToBuffer(input.professionalSignatureDataUrl);
  const clientSignatureBuffer = dataUrlToBuffer(input.clientSignatureDataUrl);
  const clientSignerName = input.clientSignerName ?? null;

  // Data/hora da aprovação formatada para exibir nas assinaturas do PDF
  const signedAtLabel = formatApprovedAtForDossierPdf(input.dossierApprovedAtIso);
  const signedAtAuditLine = formatDossierApprovalAuditLine(
    input.dossierApprovedAtIso,
    input.dossierApprovedClientIp,
  );

  const pdfInput = {
    templateName: input.template.name,
    establishmentLabel: input.establishmentLabel,
    clientLabel,
    approvedAtLabel: signedAtLabel,
    professionalName,
    crn,
    logoBuffer,
    areaName: input.areaName ?? null,
    score,
    professionalSignatureBuffer,
    clientSignatureBuffer,
    clientSignerName,
    signedAtLabel,
    signedAtAuditLine,
    documentHash: input.documentHash ?? null,
    // Cores personalizadas do cabeçalho
    headerBgColor:   pdfSettings.headerBgColor,
    headerTextColor: pdfSettings.headerTextColor,
    accentColor:     pdfSettings.accentColor,
    sections: await Promise.all(
      input.template.sections.map(async (sec) => ({
        title: sec.title,
        items: await Promise.all(
          sec.items.map(async (it) => {
            const r = input.responses[it.id] ?? {
              outcome: null,
              note: null,
              annotation: null,
              validUntil: null,
            };
            const photos = input.itemPhotos?.[it.id] ?? [];
            const photoBuffers: Buffer[] = [];
            for (const photo of photos) {
              const buffer = await downloadSignedAsset(photo.url);
              if (buffer) {
                photoBuffers.push(buffer);
              }
            }
            return {
              description: it.description,
              outcome: r.outcome,
              note: r.note,
              annotation: r.annotation,
              validUntil: r.validUntil,
              photoBuffers,
              isStructureOnly: isStructureOnlyItem(it),
            };
          }),
        ),
      })),
    ),
  };

  return buildDossierPdfBytes(pdfInput);
}
