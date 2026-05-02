import Link from "next/link";
import { notFound } from "next/navigation";

import dynamic from "next/dynamic";

const RecipeForm = dynamic(
  () =>
    import("@/components/technical-sheets/recipe-form").then(
      (mod) => mod.RecipeForm,
    ),
  {
    loading: () => (
      <div className="space-y-4 animate-pulse" aria-label="Carregando formulário…">
        <div className="h-10 rounded-lg bg-muted w-64" />
        <div className="h-48 rounded-xl bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    ),
  },
);
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { loadClientsForOwner } from "@/lib/actions/clients";
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
  const [{ recipe }, { rows: establishments }, { rows: rawMaterials }, { rows: pjClients }] =
    await Promise.all([
      loadTechnicalRecipeById(id),
      loadEstablishmentsForOwner(),
      loadRawMaterialsForOwner(),
      loadClientsForOwner({ kind: "pj" }),
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
        pjClients={pjClients}
        recipe={recipe}
        rawMaterials={rawMaterials}
      />
    </div>
  );
}
