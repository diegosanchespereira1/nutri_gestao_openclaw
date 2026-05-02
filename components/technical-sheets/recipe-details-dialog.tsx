"use client";

import { useMemo } from "react";

import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  recipe: TechnicalRecipeWithLines | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contextLabel: string;
};

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function RecipeDetailsDialog({
  recipe,
  isOpen,
  onOpenChange,
  contextLabel,
}: Props) {
  const totalIngredients = useMemo(() => recipe?.lines.length ?? 0, [recipe]);

  if (!recipe) return null;

  const createdDate = new Date(recipe.created_at).toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {/* ── Cabeçalho ── */}
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={recipe.status === "draft" ? "outline" : "default"}
            className={cn(
              recipe.status === "draft"
                ? "bg-amber-100 text-amber-900"
                : "bg-teal-100 text-teal-900"
            )}
          >
            {recipe.status === "draft" ? "Rascunho" : "Publicado"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {contextLabel}
          </span>
        </div>

        <div className="space-y-4">
          {/* ── Informações gerais ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              {recipe.classification && (
                <>
                  <div>
                    <p className="text-muted-foreground">Classificação</p>
                    <p className="font-medium">{recipe.classification}</p>
                  </div>
                </>
              )}
              {recipe.sector && (
                <>
                  <div>
                    <p className="text-muted-foreground">Sector</p>
                    <p className="font-medium">{recipe.sector}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-muted-foreground">Rendimento</p>
                <p className="font-medium">{recipe.portions_yield} porções</p>
              </div>
              <div>
                <p className="text-muted-foreground">CMV</p>
                <p className="font-medium">
                  {(recipe.cmv_percent ?? 25).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Margem</p>
                <p className="font-medium">{recipe.margin_percent.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Impostos</p>
                <p className="font-medium">{recipe.tax_percent.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium text-xs">{createdDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de ingredientes</p>
                <p className="font-medium">{totalIngredients}</p>
              </div>
            </CardContent>
          </Card>

          {/* ── Ingredientes ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingredientes</CardTitle>
              <CardDescription>
                {totalIngredients} ingrediente{totalIngredients !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10">
                      <th className="py-2 font-semibold text-foreground">
                        Ingrediente
                      </th>
                      <th className="px-2 py-2 font-semibold text-foreground text-right">
                        Qtd
                      </th>
                      <th className="px-2 py-2 font-semibold text-foreground text-center">
                        Un.
                      </th>
                      <th className="px-2 py-2 font-semibold text-foreground text-center">
                        Fatores
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.lines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-foreground/5 text-muted-foreground"
                      >
                        <td className="py-2 font-medium text-foreground">
                          <div className="max-w-xs truncate">
                            {line.ingredient_name}
                          </div>
                          {line.notes && (
                            <p className="text-xs italic text-muted-foreground mt-1">
                              {line.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {line.quantity.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-center text-xs uppercase">
                          {line.unit}
                        </td>
                        <td className="px-2 py-2 text-center text-xs">
                          <div className="flex justify-center gap-1">
                            {line.correction_factor !== 1 && (
                              <span
                                className="rounded bg-blue-100 px-1 py-0.5 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
                                title="Fator de correção"
                              >
                                C: {line.correction_factor.toFixed(2)}
                              </span>
                            )}
                            {line.cooking_factor !== 1 && (
                              <span
                                className="rounded bg-orange-100 px-1 py-0.5 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200"
                                title="Fator de cocção"
                              >
                                K: {line.cooking_factor.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalIngredients === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum ingrediente adicionado
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Ligações TACO/Matérias-primas ── */}
          {recipe.lines.some((l) => l.taco_food || l.raw_material) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Ligações e referências
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {recipe.lines
                  .filter((l) => l.taco_food || l.raw_material)
                  .map((line) => (
                    <div key={line.id} className="border-l-2 border-teal-300 pl-3">
                      <p className="font-medium text-foreground">
                        {line.ingredient_name}
                      </p>
                      {line.taco_food && (
                        <p className="text-xs text-muted-foreground">
                          🥗 TACO: {line.taco_food.name} (
                          {line.taco_food.kcal_per_100g} kcal)
                        </p>
                      )}
                      {line.raw_material && (
                        <p className="text-xs text-muted-foreground">
                          💰 Matéria-prima: {line.raw_material.name} (
                          {formatBrl(line.raw_material.unit_price_brl)}/
                          {line.raw_material.price_unit})
                        </p>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
