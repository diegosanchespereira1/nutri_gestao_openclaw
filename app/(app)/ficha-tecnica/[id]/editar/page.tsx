import { notFound } from "next/navigation";

import { RecipeForm } from "@/components/technical-sheets/recipe-form";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import {
  loadTechnicalRecipeById,
} from "@/lib/actions/technical-recipes";

export default async function EditarReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ recipe }, { rows: establishments }] = await Promise.all([
    loadTechnicalRecipeById(id),
    loadEstablishmentsForOwner(),
  ]);

  if (!recipe) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Editar receita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {recipe.name} — rascunho com linhas de ingrediente.
        </p>
      </div>
      <RecipeForm establishments={establishments} recipe={recipe} />
    </div>
  );
}
