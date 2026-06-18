"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS,
  parseTechnicalRecipeListFilters,
  serializeTechnicalRecipeListFilters,
  type TechnicalRecipeListToggleFilter,
} from "@/lib/constants/recipe-list";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<TechnicalRecipeListToggleFilter, string> = {
  favoritos: "Favoritos",
  templates: "Templates",
};

export function RecipeListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseTechnicalRecipeListFilters(
    searchParams.get("filtro") ?? undefined,
  );
  const showAll = active.length === 0;

  function pushFilters(next: TechnicalRecipeListToggleFilter[]) {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeTechnicalRecipeListFilters(next);
    if (serialized) {
      params.set("filtro", serialized);
    } else {
      params.delete("filtro");
    }
    params.delete("page");
    router.push(`/ficha-tecnica?${params.toString()}`);
  }

  function toggleFilter(filtro: TechnicalRecipeListToggleFilter) {
    const next = active.includes(filtro)
      ? active.filter((item) => item !== filtro)
      : [...active, filtro];
    pushFilters(next);
  }

  function clearFilters() {
    pushFilters([]);
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filtrar receitas"
    >
      <button
        type="button"
        onClick={clearFilters}
        aria-pressed={showAll}
        className={cn(
          buttonVariants({
            variant: showAll ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        Todos
      </button>
      {TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS.map((filtro) => (
        <button
          key={filtro}
          type="button"
          onClick={() => toggleFilter(filtro)}
          aria-pressed={active.includes(filtro)}
          className={cn(
            buttonVariants({
              variant: active.includes(filtro) ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          {FILTER_LABELS[filtro]}
        </button>
      ))}
    </div>
  );
}
