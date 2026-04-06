import { NextResponse } from "next/server";

import { loadPopWithVersionsAction } from "@/lib/actions/pops";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { buildPopPdfBytes } from "@/lib/pdf/pop-pdf";
import { createClient } from "@/lib/supabase/server";

function establishmentLabel(
  est: {
    name: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null,
): string {
  if (!est?.name) return "—";
  const client = est.clients;
  const clientName =
    client?.trade_name?.trim() || client?.legal_name?.trim() || "Cliente";
  return `${clientName} — ${est.name}`;
}

function safePdfSlug(name: string): string {
  const base = foldTextForPdf(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "pop";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ popId: string }> },
) {
  const { popId } = await ctx.params;
  const origin = new URL(req.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/pops/${popId}/pdf`)}`,
    );
  }

  const res = await loadPopWithVersionsAction(popId);
  if (!res.ok || !res.latest) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("name, clients ( legal_name, trade_name )")
    .eq("id", res.pop.establishment_id)
    .maybeSingle();

  const estTyped = est as {
    name: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn")
    .eq("user_id", user.id)
    .maybeSingle();

  let dateLabel = "";
  try {
    dateLabel = new Date(res.latest.created_at).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    dateLabel = res.latest.created_at;
  }

  const bytes = await buildPopPdfBytes({
    popTitle: res.latest.title,
    body: res.latest.body,
    meta: {
      establishmentLabel: establishmentLabel(estTyped),
      professionalName: String(profile?.full_name ?? "—"),
      professionalCrn: String(profile?.crn ?? ""),
      versionNumber: res.latest.version_number,
      versionDateLabel: dateLabel,
    },
  });

  const filename = `pop-${safePdfSlug(res.pop.title)}-v${res.latest.version_number}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
