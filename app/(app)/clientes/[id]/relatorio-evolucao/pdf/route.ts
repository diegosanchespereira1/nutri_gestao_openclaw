import { NextResponse } from "next/server";

// PDF sempre gerado on-demand — nunca cachear a resposta da rota.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  loadChecklistScoreHistory,
  loadTenantChecklistBenchmark,
} from "@/lib/actions/checklist-history";
import { DEFAULT_PDF_SETTINGS } from "@/lib/constants/checklist-pdf-settings";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { buildChecklistEvolutionReportPdf } from "@/lib/pdf/checklist-evolution-report-pdf";
import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";

/** "DD/MM/AAAA às HH:MM" no fuso de São Paulo. */
function emittedAtLabel(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(now);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(now);
  return `${date} às ${time}`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const asDownload = url.searchParams.get("download") === "1";

  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) {
    return NextResponse.redirect(
      `${url.origin}/login?next=${encodeURIComponent(`/clientes/${id}/editar?tab=checklists`)}`,
    );
  }

  // Cliente (RLS garante isolamento de tenant; validação extra de owner abaixo)
  const { data: client } = await supabase
    .from("clients")
    .select("id, owner_user_id, legal_name, trade_name")
    .eq("id", id)
    .maybeSingle();

  if (!client || client.owner_user_id !== workspaceOwnerId) {
    return new NextResponse("Cliente não encontrado.", { status: 404 });
  }

  // Dados em paralelo: histórico de scores, benchmark, perfil, estabelecimentos,
  // configurações de cor do dossiê.
  const [scoreHistory, benchmark, profileResult, estResult, settingsResult] =
    await Promise.all([
      loadChecklistScoreHistory(id),
      loadTenantChecklistBenchmark(),
      supabase
        .from("profiles")
        .select("full_name, crn")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("establishments")
        .select("name")
        .eq("client_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("checklist_pdf_settings")
        .select("header_bg_color, header_text_color, accent_color")
        .eq("workspace_owner_id", workspaceOwnerId)
        .maybeSingle(),
    ]);

  if (scoreHistory.byTemplate.length === 0) {
    return new NextResponse(
      "Nenhum checklist aprovado com pontuação disponível para este cliente.",
      { status: 404 },
    );
  }

  // Logo do tenant (best-effort)
  let logoBuffer: Buffer | null = null;
  try {
    const path = await fetchTenantLogoStoragePath(supabase);
    const signedUrl = await getTenantLogoSignedUrl(supabase, path);
    if (signedUrl) {
      const res = await fetch(signedUrl);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    logoBuffer = null;
  }

  const estNames = (estResult.data ?? []).map((e) => String(e.name ?? "").trim()).filter(Boolean);
  const establishmentLabel =
    estNames.length === 1
      ? estNames[0]
      : estNames.length > 1
        ? `${estNames.length} estabelecimentos`
        : "";

  const settings = settingsResult.data;

  const bytes = await buildChecklistEvolutionReportPdf({
    clientName: String(client.trade_name ?? "").trim() || String(client.legal_name ?? ""),
    establishmentLabel,
    professionalName: String(profileResult.data?.full_name ?? "—"),
    crn: String(profileResult.data?.crn ?? ""),
    emittedAtLabel: emittedAtLabel(),
    byTemplate: scoreHistory.byTemplate,
    benchmark: benchmark
      ? { avgScore: benchmark.avgScore, scoredSessionsCount: benchmark.scoredSessionsCount }
      : null,
    logoBuffer,
    headerBgColor: String(settings?.header_bg_color ?? DEFAULT_PDF_SETTINGS.headerBgColor),
    headerTextColor: String(settings?.header_text_color ?? DEFAULT_PDF_SETTINGS.headerTextColor),
    accentColor: String(settings?.accent_color ?? DEFAULT_PDF_SETTINGS.accentColor),
  });

  const slug = foldTextForPdf(String(client.trade_name ?? client.legal_name ?? "cliente"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="relatorio-evolucao-checklists-${slug || "cliente"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
