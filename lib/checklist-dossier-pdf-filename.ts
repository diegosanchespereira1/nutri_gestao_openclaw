import type { SupabaseClient } from "@supabase/supabase-js";

import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";

/** Data da aprovação no fuso de São Paulo, formato DD-MM-AAAA (nome do ficheiro). */
export function formatChecklistDossierApprovalDate(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts = fmt.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  return `${day}-${month}-${year}`;
}

function sanitizeFilenameSegment(raw: string, maxLen: number): string {
  const t = raw
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const cut = t.slice(0, maxLen).replace(/_+$/g, "");
  return cut.length > 0 ? cut : "na";
}

export function buildChecklistDossierPdfFilename(input: {
  clientLabel: string;
  areaLabel: string;
  approvalIso: string;
  /** Índice entre PDFs "ready" da mesma sessão (0 = primeiro, sem sufixo). */
  duplicateIndex: number;
}): string {
  const datePart = formatChecklistDossierApprovalDate(input.approvalIso);
  const clientPart = sanitizeFilenameSegment(input.clientLabel, 80);
  const areaPart = sanitizeFilenameSegment(input.areaLabel, 60);
  const base = `Checklist_${clientPart}_${datePart}_${areaPart}`;
  const suffix = input.duplicateIndex > 0 ? `_${input.duplicateIndex}` : "";
  return `${base}${suffix}.pdf`;
}

function asciiContentDispositionFallback(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_");
}

/** Cabeçalho Content-Disposition com suporte a caracteres não ASCII no nome. */
export function contentDispositionWithFilename(
  disposition: "attachment" | "inline",
  filename: string,
): string {
  const ascii = asciiContentDispositionFallback(filename);
  const star = encodeURIComponent(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${star}`;
}

/**
 * Resolve o nome do PDF para um job `ready` (cliente, data de aprovação, área, sufixo se houver vários PDFs na mesma sessão).
 */
export async function resolveChecklistDossierPdfFilename(
  supabase: SupabaseClient,
  jobId: string,
): Promise<string | null> {
  const { data: job, error: jobErr } = await supabase
    .from("checklist_fill_pdf_exports")
    .select("id, session_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job || job.status !== "ready") return null;

  const sessionId = job.session_id as string;

  const { data: session, error: sessErr } = await supabase
    .from("checklist_fill_sessions")
    .select("dossier_approved_at, area_id, establishment_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr || !session?.dossier_approved_at) return null;

  const { data: est } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .eq("id", session.establishment_id as string)
    .maybeSingle();

  if (!est) return null;

  const clientLabel = establishmentClientLabel(
    est as EstablishmentWithClientNames,
  );

  let areaLabel = "sem_area";
  const areaId = session.area_id as string | null;
  if (areaId) {
    const { data: areaRow } = await supabase
      .from("establishment_areas")
      .select("name")
      .eq("id", areaId)
      .maybeSingle();
    const n = areaRow?.name?.trim();
    if (n) areaLabel = n;
  }

  const { data: siblings } = await supabase
    .from("checklist_fill_pdf_exports")
    .select("id, created_at")
    .eq("session_id", sessionId)
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const list = siblings ?? [];
  const idx = list.findIndex((r) => r.id === jobId);
  const duplicateIndex = idx > 0 ? idx : 0;

  return buildChecklistDossierPdfFilename({
    clientLabel,
    areaLabel,
    approvalIso: session.dossier_approved_at as string,
    duplicateIndex,
  });
}
