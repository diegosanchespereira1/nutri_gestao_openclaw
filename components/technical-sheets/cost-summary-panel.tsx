import {
  divideRecipeNutritionByPortions,
  type RecipeNutritionTotals,
} from "@/lib/technical-recipes/recipe-nutrition";
import {
  computeRecipePricingBreakdown,
  computeCMVPricingBreakdown,
} from "@/lib/technical-recipes/recipe-pricing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export type CostSummaryPanelProps = {
  totalMaterialCostBrl: number;
  linesWithCost: number;
  skippedDimension: number;
  recipeNutritionTotals: RecipeNutritionTotals;
  portionsYieldInput: string;
  onPortionsYieldInputChange: (value: string) => void;
  marginPercentInput: string;
  onMarginPercentInputChange: (value: string) => void;
  taxPercentInput: string;
  onTaxPercentInputChange: (value: string) => void;
  cmvPercentInput: string;
  onCmvPercentInputChange: (value: string) => void;
};

function parsePositiveInt(s: string, fallback: number): number {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(999_999, n);
}

function parsePercentLoose(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function CostSummaryPanel({
  totalMaterialCostBrl,
  linesWithCost,
  skippedDimension,
  recipeNutritionTotals,
  portionsYieldInput,
  onPortionsYieldInputChange,
  marginPercentInput,
  onMarginPercentInputChange,
  taxPercentInput,
  onTaxPercentInputChange,
  cmvPercentInput,
  onCmvPercentInputChange,
}: CostSummaryPanelProps) {
  const portions = parsePositiveInt(portionsYieldInput, 1);
  const marginPct = Math.min(1000, parsePercentLoose(marginPercentInput));
  const taxPct = Math.min(100, parsePercentLoose(taxPercentInput));
  const cmvPct = Math.min(100, Math.max(0.1, parsePercentLoose(cmvPercentInput)));

  const pricing = computeRecipePricingBreakdown({
    totalMaterialCostBrl,
    portionsYield: portions,
    marginPercent: marginPct,
    taxPercent: taxPct,
  });

  const cmvPricing = computeCMVPricingBreakdown({
    totalMaterialCostBrl,
    portionsYield: portions,
    cmvPercent: cmvPct,
  });

  const perPortionNutrition = divideRecipeNutritionByPortions(
    recipeNutritionTotals,
    portions,
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resumo de custo e preço</CardTitle>
        <CardDescription>
          Custo total de matéria-prima; margem sobre o custo por porção; imposto
          sobre o preço sugerido. Ajuste o rendimento para ver valores por
          porção e nutrição (TACO) por porção.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Custo de matéria-prima
          </p>
          <p className="text-foreground text-2xl font-semibold tabular-nums">
            {formatBrl(totalMaterialCostBrl)}
          </p>
          {linesWithCost > 0 ? (
            <p className="text-muted-foreground text-xs">
              {linesWithCost} linha(s) com custo calculado.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Ligue linhas a matérias-primas para obter o custo total.
            </p>
          )}
          {skippedDimension > 0 ? (
            <p className="text-amber-700 dark:text-amber-400 text-xs">
              {skippedDimension} linha(s) com unidade incompatível com o preço
              registado da matéria-prima.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-portions-yield">Rendimento (porções)</Label>
            <Input
              id="recipe-portions-yield"
              inputMode="numeric"
              value={portionsYieldInput}
              onChange={(e) => onPortionsYieldInputChange(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-margin-pct">Margem (%)</Label>
            <Input
              id="recipe-margin-pct"
              inputMode="decimal"
              value={marginPercentInput}
              onChange={(e) => onMarginPercentInputChange(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-tax-pct">Impostos (%)</Label>
            <Input
              id="recipe-tax-pct"
              inputMode="decimal"
              value={taxPercentInput}
              onChange={(e) => onTaxPercentInputChange(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-cmv-pct">CMV (%)</Label>
            <Input
              id="recipe-cmv-pct"
              inputMode="decimal"
              value={cmvPercentInput}
              onChange={(e) => onCmvPercentInputChange(e.target.value)}
              placeholder="25"
            />
          </div>
        </div>

        <div className="bg-muted/40 space-y-2 rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Por porção (Margem + Impostos)
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Custo</dt>
              <dd className="text-foreground font-medium tabular-nums sm:mt-0.5">
                {formatBrl(pricing.costPerPortionBrl)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Preço sugerido (s/ imposto)</dt>
              <dd className="text-foreground font-medium tabular-nums sm:mt-0.5">
                {formatBrl(pricing.suggestedBasePricePerPortionBrl)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2 sm:block">
              <dt className="text-muted-foreground">Preço sugerido (c/ impostos)</dt>
              <dd className="text-foreground text-lg font-semibold tabular-nums sm:mt-0.5">
                {formatBrl(pricing.suggestedPriceWithTaxPerPortionBrl)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 space-y-2 rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Por porção (CMV%)
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Custo</dt>
              <dd className="text-foreground font-medium tabular-nums sm:mt-0.5">
                {formatBrl(cmvPricing.costPerPortionBrl)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2 sm:block">
              <dt className="text-muted-foreground">Preço venda (baseado em {cmvPct}% CMV)</dt>
              <dd className="text-foreground text-lg font-semibold tabular-nums sm:mt-0.5">
                {formatBrl(cmvPricing.salesPricePerPortionBrl)}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-xs pt-2 border-t border-blue-200">
            Total da receita: {formatBrl(cmvPricing.totalSalesPriceBrl)}
          </p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Nutrição estimada por porção (TACO)
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Energia</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {perPortionNutrition.kcal} kcal
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Proteína</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {perPortionNutrition.proteinG} g
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">H. de carbono</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {perPortionNutrition.carbG} g
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lípidos</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {perPortionNutrition.lipidG} g
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fibra</dt>
              <dd className="text-foreground font-medium tabular-nums">
                {perPortionNutrition.fiberG} g
              </dd>
            </div>
          </dl>
          {recipeNutritionTotals.unlinkedCount > 0 ||
          recipeNutritionTotals.skippedUnitCount > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Totais da receita podem estar incompletos:{" "}
              {recipeNutritionTotals.unlinkedCount > 0
                ? `${recipeNutritionTotals.unlinkedCount} linha(s) sem TACO. `
                : null}
              {recipeNutritionTotals.skippedUnitCount > 0
                ? `${recipeNutritionTotals.skippedUnitCount} linha(s) em unidades não convertidas para gramas.`
                : null}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
