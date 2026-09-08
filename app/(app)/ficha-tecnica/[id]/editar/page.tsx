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
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { TECHNICAL_RECIPE_IMAGES_BUCKET } from "@/lib/constants/technical-recipe-images-storage";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function EditarReceitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const [
    sp,
    { recipe },
    { rows: establishments },
    { rows: rawMaterials },
    { rows: pjClients },
  ] = await Promise.all([
    searchParams,
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

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/ficha-tecnica",
    fallbackLabel: "Ficha técnica",
    currentPath: `/ficha-tecnica/${id}/editar`,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Editar receita"
        description={`${recipe.name} — rascunho com linhas de ingrediente.`}
        back={back}
        actions={
          <Link
            href={`/ficha-tecnica/${id}/pdf`}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            Exportar PDF
          </Link>
        }
      />
      <RecipeForm
        establishments={establishments}
        pjClients={pjClients}
        recipe={recipe}
        rawMaterials={rawMaterials}
        defaultImageUrl={defaultImageUrl}
      />
    </PageLayout>
  );
}
