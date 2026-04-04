"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  RECIPE_LINE_UNIT_LABELS,
  RECIPE_LINE_UNITS,
  type RecipeLineUnit,
} from "@/lib/constants/recipe-line-units";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { validateRecipeTotals } from "@/lib/technical-recipes/validate-recipe-totals";
import { saveTechnicalRecipeDraftAction } from "@/lib/actions/technical-recipes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

type LineDraft = {
  key: string;
  ingredient_name: string;
  quantity: string;
  unit: RecipeLineUnit;
  notes: string;
};

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    ingredient_name: "",
    quantity: "",
    unit: "g",
    notes: "",
  };
}

function linesFromRecipe(recipe: TechnicalRecipeWithLines): LineDraft[] {
  if (recipe.lines.length === 0) return [newLine()];
  return recipe.lines.map((l) => ({
    key: l.id,
    ingredient_name: l.ingredient_name,
    quantity: String(l.quantity),
    unit: l.unit,
    notes: l.notes ?? "",
  }));
}

type Props = {
  establishments: EstablishmentWithClientNames[];
  recipe?: TechnicalRecipeWithLines | null;
};

export function RecipeForm({ establishments, recipe }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastTotals, setLastTotals] = useState<string | null>(null);

  const [establishmentId, setEstablishmentId] = useState(
    recipe?.establishment_id ?? establishments[0]?.id ?? "",
  );
  const [name, setName] = useState(recipe?.name ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    recipe ? linesFromRecipe(recipe) : [newLine()],
  );

  const parsedForTotals = useMemo(() => {
    const parsed: { quantity: number; unit: RecipeLineUnit }[] = [];
    for (const l of lines) {
      const q = parseFloat(l.quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) continue;
      parsed.push({ quantity: q, unit: l.unit });
    }
    return parsed;
  }, [lines]);

  const totalsPreview = useMemo(
    () => validateRecipeTotals(parsedForTotals),
    [parsedForTotals],
  );

  const isEdit = Boolean(recipe);

  function updateLine(
    key: string,
    patch: Partial<Omit<LineDraft, "key">>,
  ) {
    setLines((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastTotals(null);

    const payloadLines = lines.map((l) => ({
      ingredient_name: l.ingredient_name,
      quantity: parseFloat(l.quantity.replace(",", ".")),
      unit: l.unit,
      notes: l.notes.trim() || undefined,
    }));

    startTransition(async () => {
      const result = await saveTechnicalRecipeDraftAction({
        recipeId: recipe?.id,
        establishmentId,
        name: name.trim(),
        lines: payloadLines,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLastTotals(result.totalsLabel);
      if (!isEdit) {
        router.replace(`/ficha-tecnica/${result.recipeId}/editar`);
      } else {
        router.refresh();
      }
    });
  }

  if (establishments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem estabelecimentos</CardTitle>
          <CardDescription>
            As receitas ficam associadas a um estabelecimento de cliente PJ.
            Crie um cliente pessoa jurídica e adicione um estabelecimento antes
            de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/clientes/novo"
            className={cn(buttonVariants())}
          >
            Novo cliente
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-establishment">Estabelecimento</Label>
            {isEdit ? (
              <p
                id="recipe-establishment"
                className="text-muted-foreground text-sm"
              >
                {(() => {
                  const est = establishments.find(
                    (e) => e.id === establishmentId,
                  );
                  return est
                    ? `${establishmentClientLabel(est)} — ${est.name}`
                    : establishmentId;
                })()}
              </p>
            ) : (
              <select
                id="recipe-establishment"
                className={selectClassName}
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
                required
              >
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {establishmentClientLabel(est)} — {est.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Nome da receita</Label>
            <Input
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Sopa de legumes — lote base"
              required
              maxLength={200}
            />
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validação de totais</CardTitle>
            <CardDescription>
              Só é possível somar automaticamente quando todas as linhas usam
              apenas massa (g, kg) ou apenas volume (ml, l).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-foreground">{totalsPreview.label}</p>
            {lastTotals ? (
              <p className="text-muted-foreground border-t pt-2">
                Último guardado: {lastTotals}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground font-medium">Ingredientes</h2>
            <p className="text-muted-foreground text-sm">
              Quantidade e unidade por linha (rascunho guardado na sua conta).
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="size-4" />
            Linha
          </Button>
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:grid sm:grid-cols-[1fr_120px_140px_auto] sm:items-end"
            >
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs" htmlFor={`ing-${line.key}`}>
                  Ingrediente {index + 1}
                </Label>
                <Input
                  id={`ing-${line.key}`}
                  value={line.ingredient_name}
                  onChange={(e) =>
                    updateLine(line.key, { ingredient_name: e.target.value })
                  }
                  placeholder="Nome do ingrediente"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor={`qty-${line.key}`}>
                  Quantidade
                </Label>
                <Input
                  id={`qty-${line.key}`}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.key, { quantity: e.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor={`unit-${line.key}`}>
                  Unidade
                </Label>
                <select
                  id={`unit-${line.key}`}
                  className={selectClassName}
                  value={line.unit}
                  onChange={(e) =>
                    updateLine(line.key, {
                      unit: e.target.value as RecipeLineUnit,
                    })
                  }
                >
                  {RECIPE_LINE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {RECIPE_LINE_UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(line.key)}
                  aria-label="Remover linha"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="space-y-1.5 sm:col-span-full">
                <Label className="text-xs" htmlFor={`notes-${line.key}`}>
                  Notas (opcional)
                </Label>
                <Input
                  id={`notes-${line.key}`}
                  value={line.notes}
                  onChange={(e) =>
                    updateLine(line.key, { notes: e.target.value })
                  }
                  placeholder="Observações sobre a linha"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar…" : "Guardar rascunho"}
        </Button>
        <Link
          href="/ficha-tecnica"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
