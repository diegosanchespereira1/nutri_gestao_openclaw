import type { SupabaseClient } from "@supabase/supabase-js";

import { TENANT_LOGOS_BUCKET } from "@/lib/constants/tenant-logos-storage";
import { fetchTenantLogoStoragePath } from "@/lib/tenant/logo-sync";
import { buildDossierPdfBytes, foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

export function formatApprovedAtForDossierPdf(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "long",
      timeStyle: "short",
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
  /** Rótulo “limpo” do cliente (fallback: extraído do establishmentLabel). */
  clientLabel?: string;
  /** Nome da área avaliada (quando aplicável). */
  areaName?: string | null;
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
  const professional = await loadProfessionalIdentity(supabase, userId);

  const professionalName = foldTextForPdf(
    professional.fullName || "Profissional",
  );
  const crn = foldTextForPdf(professional.crn);

  const logoBuffer = await loadTenantLogoBuffer(supabase);

  let score: SessionScore = null;
  if (input.sessionId) {
    score = await loadSessionScore(supabase, input.sessionId);
  }
  if (!score) {
    score = computeScoreFromTemplate(input.template, input.responses);
  }

  const clientLabel = input.clientLabel ?? extractClientLabel(input.establishmentLabel);

  const pdfInput = {
    templateName: input.template.name,
    establishmentLabel: input.establishmentLabel,
    clientLabel,
    approvedAtLabel: formatApprovedAtForDossierPdf(input.dossierApprovedAtIso),
    professionalName,
    crn,
    logoBuffer,
    areaName: input.areaName ?? null,
    score,
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
            };
          }),
        ),
      })),
    ),
  };

  return buildDossierPdfBytes(pdfInput);
}
