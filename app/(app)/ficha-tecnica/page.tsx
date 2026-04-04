import Link from "next/link";

import { RecipeListRowActions } from "@/components/technical-sheets/recipe-list-row-actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadTechnicalRecipesForOwner } from "@/lib/actions/technical-recipes";
import { cn } from "@/lib/utils";
import type { TechnicalRecipeListItem } from "@/lib/types/technical-recipes";

function recipeContextLabel(row: TechnicalRecipeListItem): string {
  const est = row.establishments;
  if (!est?.name) return "—";
  const client = est.clients ?? undefined;
  const clientName =
    client?.trade_name?.trim() || client?.legal_name?.trim() || "Cliente";
  return `${clientName} — ${est.name}`;
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default async function FichaTecnicaPage() {
  const [{ rows: recipes }, { rows: establishments }] = await Promise.all([
    loadTechnicalRecipesForOwner(),
    loadEstablishmentsForOwner(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Ficha técnica
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Receitas com ingredientes, TACO e custo por matéria-prima. PDF e
            impostos nas stories seguintes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ficha-tecnica/materias-primas"
            className={buttonVariants({ variant: "outline" })}
          >
            Matérias-primas
          </Link>
          <Link
            href="/ficha-tecnica/nova"
            className={cn(
              buttonVariants(),
              establishments.length === 0 && "pointer-events-none opacity-50",
            )}
            aria-disabled={establishments.length === 0}
          >
            Nova receita
          </Link>
        </div>
      </div>

      {establishments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Precisa de pelo menos um estabelecimento (cliente PJ) para criar
          receitas.{" "}
          <Link href="/clientes/novo" className="text-primary underline">
            Criar cliente
          </Link>
        </p>
      ) : null}

      {recipes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ainda não há receitas. Use «Nova receita» para adicionar ingredientes e
          guardar um rascunho.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 font-medium">Receita</th>
                <th className="px-4 py-3 font-medium">Contexto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="text-foreground px-4 py-3 font-medium">
                    {row.name}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {recipeContextLabel(row)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs capitalize">
                      {row.status === "draft" ? "Rascunho" : row.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {formatUpdatedAt(row.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RecipeListRowActions recipeId={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
