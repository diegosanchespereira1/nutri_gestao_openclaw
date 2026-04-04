import { RecipeForm } from "@/components/technical-sheets/recipe-form";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";

export default async function NovaReceitaPage() {
  const { rows: establishments } = await loadEstablishmentsForOwner();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Nova receita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ingredientes com quantidade e unidade. Guarde o rascunho e valide os
          totais no painel ao lado.
        </p>
      </div>
      <RecipeForm establishments={establishments} />
    </div>
  );
}
