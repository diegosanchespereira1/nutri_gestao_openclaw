import Link from "next/link";
import { notFound } from "next/navigation";

import dynamic from "next/dynamic";

const RecipeForm = dynamic(
  () =>
    import("@/components/technical-sheets/recipe-form").then(
      (mod) => mod.RecipeForm,
    ),
  { loading: () => null },
);
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { TECHNICAL_RECIPE_IMAGES_BUCKET } from "@/lib/constants/technical-recipe-images-storage";
import { createClient } from "@/lib/supabase/server";

export default async function EditarReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ recipe }, { rows: establishments }, { rows: rawMaterials }, { rows: pjClients }] =
    await Promise.all([
      loadTechnicalRecipeById(id),
      loadEstablishmentsForOwner(),
      loadRawMaterialsForOwner(),
      loadClientsForOwner({ kind: "pj" }),
    ]);

  if (!recipe) notFound();

  const supabase = await createClient();
  let defaultImageUrl: string | null = null;
  if (recipe.image_storage_path) {
    const { data } = await supabase.storage
      .from(TECHNICAL_RECIPE_IMAGES_BUCKET)
      .createSignedUrl(recipe.image_storage_path, 60 * 60);
    defaultImageUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Editar receita
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {recipe.name} — rascunho com linhas de ingrediente.
          </p>
        </div>
        <Link
          href={`/ficha-tecnica/${id}/pdf`}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Exportar PDF
        </Link>
      </div>
      <RecipeForm
        establishments={establishments}
        pjClients={pjClients}
        recipe={recipe}
        rawMaterials={rawMaterials}
        defaultImageUrl={defaultImageUrl}
      />
    </div>
  );
}
