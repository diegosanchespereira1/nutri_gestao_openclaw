import { NextResponse } from "next/server";

import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { buildTechnicalRecipePdfBytes } from "@/lib/pdf/technical-sheet-pdf";
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

function safePdfFileSlug(name: string): string {
  const base = foldTextForPdf(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "receita";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/ficha-tecnica/${id}/pdf`)}`,
    );
  }

  const { recipe } = await loadTechnicalRecipeById(id);
  if (!recipe) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const [{ data: est }, { data: clientOnly }, { data: profile }] =
    await Promise.all([
      recipe.establishment_id
        ? supabase
            .from("establishments")
            .select("name, clients ( legal_name, trade_name )")
            .eq("id", recipe.establishment_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      !recipe.establishment_id && recipe.client_id
        ? supabase
            .from("clients")
            .select("legal_name, trade_name")
            .eq("id", recipe.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("profiles")
        .select("full_name, crn")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const estTyped = est as {
    name: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null;

  const clientTyped = clientOnly as {
    legal_name: string;
    trade_name: string | null;
  } | null;

  const contextLabel =
    recipe.establishment_id != null
      ? establishmentLabel(estTyped)
      : clientTyped
        ? (() => {
            const n =
              clientTyped.trade_name?.trim() ||
              clientTyped.legal_name?.trim() ||
              "Cliente PJ";
            return `${n} — catálogo (todos os estabelecimentos)`;
          })()
        : "—";

  const bytes = await buildTechnicalRecipePdfBytes(recipe, {
    establishmentLabel: contextLabel,
    professionalName: String(profile?.full_name ?? "—"),
    professionalCrn: String(profile?.crn ?? ""),
  });

  const filename = `ficha-tecnica-${safePdfFileSlug(recipe.name)}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
