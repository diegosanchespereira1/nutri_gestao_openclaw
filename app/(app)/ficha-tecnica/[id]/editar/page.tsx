import Link from "next/link";
import { notFound } from "next/navigation";

import { RecipeForm } from "@/components/technical-sheets/recipe-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import {
  loadTechnicalRecipeById,
} from "@/lib/actions/technical-recipes";

export default async function EditarReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ recipe }, { rows: establishments }, { rows: rawMaterials }] =
    await Promise.all([
      loadTechnicalRecipeById(id),
      loadEstablishmentsForOwner(),
      loadRawMaterialsForOwner(),
    ]);

  if (!recipe) notFound();

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
          target="_blank"
          rel="noopener noreferrer"
        >
          Exportar PDF
        </Link>
      </div>
      <RecipeForm
        establishments={establishments}
        recipe={recipe}
        rawMaterials={rawMaterials}
      />
    </div>
  );
}
