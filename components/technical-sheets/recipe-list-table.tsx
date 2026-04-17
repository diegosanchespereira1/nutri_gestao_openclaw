"use client";

import { useState } from "react";

import type {
  TechnicalRecipeListItem,
  TechnicalRecipeWithLines,
} from "@/lib/types/technical-recipes";
import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { RecipeListRowActions } from "@/components/technical-sheets/recipe-list-row-actions";
import { RecipeDetailsDialog } from "@/components/technical-sheets/recipe-details-dialog";
import {
  recipeClientIdForListRow,
  recipeContextLabel,
} from "@/lib/utils/technical-recipe-list-labels";
import { cn } from "@/lib/utils";

type Props = {
  recipes: TechnicalRecipeListItem[];
};

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

export function RecipeListTable({ recipes }: Props) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipeListItem, setSelectedRecipeListItem] =
    useState<TechnicalRecipeListItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRecipeDetails, setSelectedRecipeDetails] =
    useState<TechnicalRecipeWithLines | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function handleRowClick(recipe: TechnicalRecipeListItem) {
    if (!selectedRecipeId || selectedRecipeId !== recipe.id) {
      setLoadingDetails(true);
      try {
        const { recipe: fullRecipe } = await loadTechnicalRecipeById(recipe.id);
        if (fullRecipe) {
          setSelectedRecipeId(recipe.id);
          setSelectedRecipeListItem(recipe);
          setSelectedRecipeDetails(fullRecipe);
          setDetailsDialogOpen(true);
        } else {
          console.error("Não foi possível carregar os detalhes da receita");
          window.alert("Não foi possível carregar os detalhes da receita. Tente novamente.");
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes da receita:", error);
        window.alert("Erro ao carregar os detalhes da receita. Tente novamente.");
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setDetailsDialogOpen(true);
    }
  }

  return (
    <>
      <div className="border-border bg-card overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
            <tr>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Receita
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Contexto
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Estado
              </th>
              <th className="text-foreground px-4 py-3 text-left font-bold">
                Atualizado
              </th>
              <th className="text-foreground px-4 py-3 text-right font-bold">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-foreground/5 last:border-0 transition-colors",
                  loadingDetails ? "opacity-50 cursor-wait" : "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => !loadingDetails && handleRowClick(row)}
              >
                <td className="text-foreground px-4 py-3 text-base font-semibold">
                  {row.name}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {recipeContextLabel(row)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold",
                      row.status === "draft"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                        : "bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                    )}
                  >
                    {row.status === "draft" ? "Rascunho" : "Publicado"}
                  </span>
                </td>
                <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                  {formatUpdatedAt(row.updated_at)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RecipeListRowActions
                    recipeId={row.id}
                    isTemplate={row.is_template}
                    clientId={recipeClientIdForListRow(row)}
                    isTemplateFavorite={row.is_template_favorite ?? false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecipeDetailsDialog
        recipe={selectedRecipeDetails}
        isOpen={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        contextLabel={
          selectedRecipeListItem
            ? recipeContextLabel(selectedRecipeListItem)
            : ""
        }
      />
    </>
  );
}
