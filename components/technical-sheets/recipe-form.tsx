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
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import {
  lineRawMaterialCostBrl,
  sumRecipeMaterialCostBrl,
} from "@/lib/technical-recipes/recipe-material-cost";
import { computeRecipeNutritionTotals } from "@/lib/technical-recipes/recipe-nutrition";
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
import { TacoLineLinker } from "@/components/technical-sheets/taco-line-linker";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Fator 0,01–10 para payload e pré-visualizações; inválido → 1. */
function parseFactorInput(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(0.01, n));
}

type LineDraft = {
  key: string;
  ingredient_name: string;
  quantity: string;
  unit: RecipeLineUnit;
  notes: string;
  taco_food_id: string | null;
  taco_food: TacoReferenceFoodRow | null;
  raw_material_id: string | null;
  raw_material: RawMaterialRow | null;
  correction_factor: string;
  cooking_factor: string;
};

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    ingredient_name: "",
    quantity: "",
    unit: "g",
    notes: "",
    taco_food_id: null,
    taco_food: null,
    raw_material_id: null,
    raw_material: null,
    correction_factor: "1",
    cooking_factor: "1",
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
    taco_food_id: l.taco_food_id,
    taco_food: l.taco_food,
    raw_material_id: l.raw_material_id,
    raw_material: l.raw_material,
    correction_factor: String(l.correction_factor ?? 1),
    cooking_factor: String(l.cooking_factor ?? 1),
  }));
}

type Props = {
  establishments: EstablishmentWithClientNames[];
  recipe?: TechnicalRecipeWithLines | null;
  rawMaterials?: RawMaterialRow[];
};

export function RecipeForm({
  establishments,
  recipe,
  rawMaterials = [],
}: Props) {
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

  const nutritionPreview = useMemo(() => {
    const parsed: Array<{
      quantity: number;
      unit: RecipeLineUnit;
      taco: TacoReferenceFoodRow | null;
      cooking_factor?: number;
    }> = [];
    for (const l of lines) {
      const q = parseFloat(l.quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) continue;
      parsed.push({
        quantity: q,
        unit: l.unit,
        taco: l.taco_food,
        cooking_factor: parseFactorInput(l.cooking_factor),
      });
    }
    return computeRecipeNutritionTotals(parsed);
  }, [lines]);

  const costPreview = useMemo(() => {
    const parsed: Array<{
      quantity: number;
      unit: RecipeLineUnit;
      raw_material: RawMaterialRow | null;
      correction_factor?: number;
    }> = [];
    for (const l of lines) {
      const q = parseFloat(l.quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) continue;
      parsed.push({
        quantity: q,
        unit: l.unit,
        raw_material: l.raw_material,
        correction_factor: parseFactorInput(l.correction_factor),
      });
    }
    return sumRecipeMaterialCostBrl(parsed);
  }, [lines]);

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
      taco_food_id: l.taco_food_id,
      raw_material_id: l.raw_material_id,
      correction_factor: parseFactorInput(l.correction_factor),
      cooking_factor: parseFactorInput(l.cooking_factor),
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

        <div className="space-y-4">
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

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Nutrição estimada (TACO)
              </CardTitle>
              <CardDescription>
                Valores por 100 g do item ligado; aplica o fator de cocção por
                linha. ml/l assumem densidade tipo água; &quot;un&quot; não entra
                no somatório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Energia</dt>
                  <dd className="text-foreground font-medium tabular-nums">
                    {nutritionPreview.kcal} kcal
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Proteína</dt>
                  <dd className="text-foreground font-medium tabular-nums">
                    {nutritionPreview.proteinG} g
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">H. de carbono</dt>
                  <dd className="text-foreground font-medium tabular-nums">
                    {nutritionPreview.carbG} g
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Lípidos</dt>
                  <dd className="text-foreground font-medium tabular-nums">
                    {nutritionPreview.lipidG} g
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fibra</dt>
                  <dd className="text-foreground font-medium tabular-nums">
                    {nutritionPreview.fiberG} g
                  </dd>
                </div>
              </dl>
              {nutritionPreview.unlinkedCount > 0 ||
              nutritionPreview.skippedUnitCount > 0 ? (
                <p className="text-muted-foreground border-border mt-2 border-t pt-2 text-xs">
                  {nutritionPreview.unlinkedCount > 0
                    ? `${nutritionPreview.unlinkedCount} linha(s) sem TACO. `
                    : null}
                  {nutritionPreview.skippedUnitCount > 0
                    ? `${nutritionPreview.skippedUnitCount} linha(s) em unidades não convertidas para gramas.`
                    : null}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Custo estimado (matéria-prima)
              </CardTitle>
              <CardDescription>
                Usa a quantidade × fator de correção por linha; mesma dimensão
                de unidade que a matéria-prima (massa, volume ou unidade).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-foreground text-lg font-semibold tabular-nums">
                {formatBrl(costPreview.totalBrl)}
              </p>
              {costPreview.linesWithCost > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {costPreview.linesWithCost} linha(s) com custo calculado.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Ligue linhas a matérias-primas em «Matéria-prima (custo)».
                </p>
              )}
              {costPreview.skippedDimension > 0 ? (
                <p className="text-amber-700 dark:text-amber-400 text-xs">
                  {costPreview.skippedDimension} linha(s) com unidade incompatível
                  com o preço registado da matéria-prima.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground font-medium">Ingredientes</h2>
            <p className="text-muted-foreground text-sm">
              Quantidade e unidade; associe{" "}
              <Link
                href="/ficha-tecnica/materias-primas"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                matéria-prima
              </Link>{" "}
              para custo e TACO para nutrição.
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
              <div className="flex flex-wrap items-end gap-4 sm:col-span-full">
                <div className="w-full min-w-[7rem] space-y-1.5 sm:w-36">
                  <Label className="text-xs" htmlFor={`corr-${line.key}`}>
                    Correção (custo)
                  </Label>
                  <Input
                    id={`corr-${line.key}`}
                    inputMode="decimal"
                    value={line.correction_factor}
                    onChange={(e) =>
                      updateLine(line.key, {
                        correction_factor: e.target.value,
                      })
                    }
                    placeholder="1"
                    aria-describedby={`factors-hint-${line.key}`}
                  />
                </div>
                <div className="w-full min-w-[7rem] space-y-1.5 sm:w-36">
                  <Label className="text-xs" htmlFor={`cook-${line.key}`}>
                    Cocção (TACO)
                  </Label>
                  <Input
                    id={`cook-${line.key}`}
                    inputMode="decimal"
                    value={line.cooking_factor}
                    onChange={(e) =>
                      updateLine(line.key, {
                        cooking_factor: e.target.value,
                      })
                    }
                    placeholder="1"
                    aria-describedby={`factors-hint-${line.key}`}
                  />
                </div>
              </div>
              <p
                id={`factors-hint-${line.key}`}
                className="text-muted-foreground sm:col-span-full text-xs"
              >
                1 = sem ajuste. Correção multiplica a quantidade no custo da
                matéria-prima; cocção multiplica na nutrição (TACO).
              </p>
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
              <div className="space-y-1.5 sm:col-span-full">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label className="text-xs" htmlFor={`rm-${line.key}`}>
                      Matéria-prima (custo)
                    </Label>
                    <select
                      id={`rm-${line.key}`}
                      className={selectClassName}
                      value={line.raw_material_id ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const mat = id
                          ? (rawMaterials.find((r) => r.id === id) ?? null)
                          : null;
                        updateLine(line.key, {
                          raw_material_id: id.length > 0 ? id : null,
                          raw_material: mat,
                        });
                      }}
                    >
                      <option value="">— Nenhuma —</option>
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatBrl(m.unit_price_brl)} /{" "}
                          {RECIPE_LINE_UNIT_LABELS[m.price_unit]})
                        </option>
                      ))}
                    </select>
                  </div>
                  {rawMaterials.length === 0 ? (
                    <Link
                      href="/ficha-tecnica/materias-primas/nova"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Criar matéria-prima
                    </Link>
                  ) : null}
                </div>
                {line.raw_material
                  ? (() => {
                      const q = parseFloat(line.quantity.replace(",", "."));
                      if (!Number.isFinite(q) || q <= 0) return null;
                      const r = lineRawMaterialCostBrl(
                        q * parseFactorInput(line.correction_factor),
                        line.unit,
                        line.raw_material,
                      );
                      if (r.skipped && r.reason === "dimension_mismatch") {
                        return (
                          <p className="text-amber-700 dark:text-amber-400 text-xs">
                            A unidade desta linha não coincide com a dimensão do
                            preço da matéria-prima (ex.: g/kg vs ml/l).
                          </p>
                        );
                      }
                      if (r.skipped) return null;
                      return (
                        <p className="text-muted-foreground text-xs">
                          Custo estimado da linha:{" "}
                          <span className="text-foreground font-medium tabular-nums">
                            {formatBrl(r.brl)}
                          </span>
                        </p>
                      );
                    })()
                  : null}
              </div>
              <TacoLineLinker
                inputId={`taco-${line.key}`}
                linked={line.taco_food}
                onLinkedChange={(food, opts) => {
                  setLines((prev) =>
                    prev.map((row) => {
                      if (row.key !== line.key) return row;
                      if (!food) {
                        return {
                          ...row,
                          taco_food: null,
                          taco_food_id: null,
                        };
                      }
                      return {
                        ...row,
                        taco_food: food,
                        taco_food_id: food.id,
                        ingredient_name:
                          opts?.syncIngredientName === true
                            ? food.name
                            : row.ingredient_name,
                      };
                    }),
                  );
                }}
              />
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
