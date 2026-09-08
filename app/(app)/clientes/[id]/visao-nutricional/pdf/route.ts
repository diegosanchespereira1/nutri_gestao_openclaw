import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { loadSchoolNutritionOverview } from "@/lib/actions/school-nutrition-overview";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { buildSchoolNutritionOverviewPdf } from "@/lib/pdf/school-nutrition-overview-pdf";
import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";

function emittedAtLabel(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(now);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  const serie = url.searchParams.get("serie");

  const loaded = await loadSchoolNutritionOverview(id, serie);
  if (!loaded.ok && loaded.reason === "unauthenticated") {
    return NextResponse.redirect(
      `${url.origin}/login?next=${encodeURIComponent(`/clientes/${id}/visao-nutricional`)}`,
    );
  }
  if (!loaded.ok) {
    return new NextResponse("Escola não encontrada.", { status: 404 });
  }

  const { supabase } = await getServerContext();
  let logoBuffer: Buffer | null = null;
  try {
    const storagePath = await fetchTenantLogoStoragePath(supabase);
    const signedUrl = await getTenantLogoSignedUrl(supabase, storagePath);
    if (signedUrl) {
      const res = await fetch(signedUrl);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    logoBuffer = null;
  }

  const bytes = await buildSchoolNutritionOverviewPdf({
    clientName: loaded.clientName,
    professionalName: loaded.professionalName,
    emittedAtLabel: emittedAtLabel(),
    overview: loaded.overview,
    logoBuffer,
  });

  const slug = foldTextForPdf(loaded.clientName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="visao-nutricional-${slug || "escola"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
