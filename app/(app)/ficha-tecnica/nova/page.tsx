import { RecipeForm } from "@/components/technical-sheets/recipe-form";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";

export default async function NovaReceitaPage() {
  const [{ rows: establishments }, { rows: rawMaterials }, { rows: pjClients }] =
    await Promise.all([
      loadEstablishmentsForOwner(),
      loadRawMaterialsForOwner(),
      loadClientsForOwner({ kind: "pj" }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Nova receita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ingredientes com quantidade e unidade. Salve o rascunho e valide os
          totais no painel ao lado. Pode utilizar um template antes de editar.
        </p>
      </div>
      <RecipeForm
        establishments={establishments}
        pjClients={pjClients}
        rawMaterials={rawMaterials}
      />
    </div>
  );
}
