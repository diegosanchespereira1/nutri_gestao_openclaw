import { NextResponse } from "next/server";

import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { TECHNICAL_RECIPE_IMAGES_BUCKET } from "@/lib/constants/technical-recipe-images-storage";
import { TENANT_LOGOS_BUCKET } from "@/lib/constants/tenant-logos-storage";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { buildTechnicalRecipePdfBytes } from "@/lib/pdf/technical-sheet-pdf";
import { fetchTenantLogoStoragePath } from "@/lib/tenant/logo-sync";
import { createClient } from "@/lib/supabase/server";

function safePdfFileSlug(name: string): string {
  const base = foldTextForPdf(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "receita";
}

async function downloadBufferFromSignedUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadStorageImageBuffer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string | null | undefined,
): Promise<Buffer | null> {
  if (!path?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return null;
  return downloadBufferFromSignedUrl(data.signedUrl);
}

function clientDisplayName(client: {
  legal_name: string;
  trade_name: string | null;
} | null): string {
  if (!client) return "—";
  return client.trade_name?.trim() || client.legal_name?.trim() || "Cliente";
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

  const [
    { data: est },
    { data: clientOnly },
    { data: profile },
    { data: tenantNameRaw },
    tenantLogoBuffer,
    recipeImageBuffer,
  ] = await Promise.all([
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
    supabase.rpc("workspace_tenant_name"),
    fetchTenantLogoStoragePath(supabase).then((path) =>
      loadStorageImageBuffer(supabase, TENANT_LOGOS_BUCKET, path),
    ),
    loadStorageImageBuffer(
      supabase,
      TECHNICAL_RECIPE_IMAGES_BUCKET,
      recipe.image_storage_path,
    ),
  ]);

  const estTyped = est as {
    name: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null;

  const clientTyped = clientOnly as {
    legal_name: string;
    trade_name: string | null;
  } | null;

  const clientName = estTyped?.clients
    ? clientDisplayName(estTyped.clients)
    : clientDisplayName(clientTyped);

  const establishmentName = estTyped?.name?.trim() || null;

  const tenantName =
    (typeof tenantNameRaw === "string" && tenantNameRaw.trim()) ||
    String(profile?.full_name ?? "NutriGestão");

  const bytes = await buildTechnicalRecipePdfBytes(recipe, {
    tenantName,
    tenantLogoBuffer,
    clientName,
    establishmentName,
    recipeImageBuffer,
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
