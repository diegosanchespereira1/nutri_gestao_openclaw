"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";

import {
  RECIPE_LINE_UNIT_LABELS,
  RECIPE_LINE_UNITS,
  type RecipeLineUnit,
} from "@/lib/constants/recipe-line-units";
import type { ClientRow } from "@/lib/types/clients";
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
import { scaleIngredientQuantitiesForPortionYield } from "@/lib/technical-recipes/recipe-yield-scale";
import { validateRecipeTotals } from "@/lib/technical-recipes/validate-recipe-totals";
import {
  loadTemplateDataForNewRecipeAction,
  saveTechnicalRecipeDraftAction,
} from "@/lib/actions/technical-recipes";
import type { RecipeFormDraftV1 } from "@/lib/technical-recipes/recipe-form-draft";
import {
  readRecipeFormDraftFromStorage,
  recipeFormDraftStorageKey,
  removeRecipeFormDraftFromStorage,
  writeRecipeFormDraftToStorage,
} from "@/lib/technical-recipes/recipe-form-draft";
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
import { RecipeFormIntroductionSections } from "@/components/technical-sheets/recipe-form-introduction-sections";
import { TacoLineLinker } from "@/components/technical-sheets/taco-line-linker";
import { CostSummaryPanel } from "@/components/technical-sheets/cost-summary-panel";
import { RecipeTemplatePickerDialog } from "@/components/technical-sheets/recipe-template-picker-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/** Labels mais subtis que o valor preenchido (design system — hierarquia). */
const fieldLabelClassName = "text-muted-foreground";

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

/** Chave fixa para a 1.ª linha em SSR — evita hydration mismatch (servidor ≠ cliente com `randomUUID`). */
const INITIAL_LINE_KEY = "__recipe-line-initial__";

function newLine(key?: string): LineDraft {
  return {
    key: key ?? crypto.randomUUID(),
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
  if (recipe.lines.length === 0) return [newLine(INITIAL_LINE_KEY)];
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

function serializeRecipeFormState(args: {
  recipeScope: "establishment" | "org";
  establishmentId: string;
  clientIdForOrg: string;
  name: string;
  classification: string;
  sector: string;
  portionsYieldInput: string;
  marginPercentInput: string;
  taxPercentInput: string;
  cmvPercentInput: string;
  scaleTargetInput: string;
  lines: LineDraft[];
}): string {
  const lineSnap = args.lines.map((l) => ({
    ingredient_name: l.ingredient_name,
    quantity: l.quantity,
    unit: l.unit,
    notes: l.notes,
    taco_food_id: l.taco_food_id,
    raw_material_id: l.raw_material_id,
    correction_factor: l.correction_factor,
    cooking_factor: l.cooking_factor,
  }));
  return JSON.stringify({
    recipeScope: args.recipeScope,
    establishmentId: args.establishmentId,
    clientIdForOrg: args.clientIdForOrg,
    name: args.name,
    classification: args.classification,
    sector: args.sector,
    portionsYieldInput: args.portionsYieldInput,
    marginPercentInput: args.marginPercentInput,
    taxPercentInput: args.taxPercentInput,
    cmvPercentInput: args.cmvPercentInput,
    scaleTargetInput: args.scaleTargetInput,
    lines: lineSnap,
  });
}

function initialFormSnapshot(
  recipe: TechnicalRecipeWithLines | null | undefined,
  establishments: EstablishmentWithClientNames[],
  pjClients: ClientRow[],
): string {
  const recipeScope: "establishment" | "org" = recipe
    ? recipe.establishment_id
      ? "establishment"
      : "org"
    : establishments.length > 0
      ? "establishment"
      : "org";
  const establishmentId =
    recipe?.establishment_id ?? establishments[0]?.id ?? "";
  const clientIdForOrg =
    recipe && !recipe.establishment_id
      ? recipe.client_id
      : (pjClients[0]?.id ?? "");
  const name = recipe?.name ?? "";
  const lines = recipe
    ? linesFromRecipe(recipe)
    : [newLine(INITIAL_LINE_KEY)];
  return serializeRecipeFormState({
    recipeScope,
    establishmentId,
    clientIdForOrg,
    name,
    classification: recipe?.classification ?? "",
    sector: recipe?.sector ?? "",
    portionsYieldInput: String(recipe?.portions_yield ?? 1),
    marginPercentInput: String(recipe?.margin_percent ?? 0),
    taxPercentInput: String(recipe?.tax_percent ?? 0),
    cmvPercentInput: String(recipe?.cmv_percent ?? 25),
    scaleTargetInput: "",
    lines,
  });
}

function linesFromStoredDraft(
  draft: RecipeFormDraftV1,
  rawMaterials: RawMaterialRow[],
): LineDraft[] {
  if (draft.lines.length === 0) return [newLine(INITIAL_LINE_KEY)];
  return draft.lines.map((l, index) => {
    const rm =
      l.raw_material_id != null
        ? (rawMaterials.find((m) => m.id === l.raw_material_id) ?? null)
        : null;
    return {
      key: index === 0 ? INITIAL_LINE_KEY : crypto.randomUUID(),
      ingredient_name: l.ingredient_name,
      quantity: l.quantity,
      unit: l.unit,
      notes: l.notes,
      taco_food_id: l.taco_food_id,
      taco_food: l.taco_food,
      raw_material_id: l.raw_material_id,
      raw_material: rm,
      correction_factor: l.correction_factor,
      cooking_factor: l.cooking_factor,
    };
  });
}

type Props = {
  establishments: EstablishmentWithClientNames[];
  /** Clientes PJ do owner (receitas ao nível do cliente / catálogo). */
  pjClients: ClientRow[];
  recipe?: TechnicalRecipeWithLines | null;
  rawMaterials?: RawMaterialRow[];
};

export function RecipeForm({
  establishments,
  pjClients,
  recipe,
  rawMaterials = [],
}: Props) {
  const router = useRouter();
  const saveIntentRef = useRef<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTotals, setLastTotals] = useState<string | null>(null);

  const [recipeScope, setRecipeScope] = useState<
    "establishment" | "org"
  >(() =>
    recipe
      ? recipe.establishment_id
        ? "establishment"
        : "org"
      : establishments.length > 0
        ? "establishment"
        : "org",
  );
  const [clientIdForOrg, setClientIdForOrg] = useState(() =>
    recipe && !recipe.establishment_id
      ? recipe.client_id
      : (pjClients[0]?.id ?? ""),
  );
  const [establishmentId, setEstablishmentId] = useState(() => {
    if (recipe?.establishment_id) return recipe.establishment_id;
    if (recipe && recipe.establishment_id == null) return "";
    return establishments[0]?.id ?? "";
  });
  const [name, setName] = useState(recipe?.name ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    recipe ? linesFromRecipe(recipe) : [newLine(INITIAL_LINE_KEY)],
  );
  const [portionsYieldInput, setPortionsYieldInput] = useState(() =>
    String(recipe?.portions_yield ?? 1),
  );
  const [marginPercentInput, setMarginPercentInput] = useState(() =>
    String(recipe?.margin_percent ?? 0),
  );
  const [taxPercentInput, setTaxPercentInput] = useState(() =>
    String(recipe?.tax_percent ?? 0),
  );
  const [scaleTargetInput, setScaleTargetInput] = useState("");
  const [classification, setClassification] = useState(recipe?.classification ?? "");
  const [sector, setSector] = useState(recipe?.sector ?? "");
  const [cmvPercentInput, setCmvPercentInput] = useState(() =>
    String(recipe?.cmv_percent ?? 25),
  );

  const isEdit = Boolean(recipe);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [draftPreviewOpen, setDraftPreviewOpen] = useState(false);
  const [localDraftBanner, setLocalDraftBanner] = useState(false);
  const [storedDraft, setStoredDraft] = useState<RecipeFormDraftV1 | null>(
    null,
  );
  const [baseline, setBaseline] = useState(() =>
    initialFormSnapshot(recipe, establishments, pjClients),
  );

  const draftStorageKey = recipeFormDraftStorageKey(
    isEdit ? "edit" : "new",
    recipe?.id,
    recipeScope === "org"
      ? {
          kind: "org",
          clientId: clientIdForOrg || pjClients[0]?.id || "__none__",
        }
      : {
          kind: "establishment",
          establishmentId:
            establishmentId || establishments[0]?.id || "__none__",
        },
  );

  const getSerialized = useCallback(() => {
    return serializeRecipeFormState({
      recipeScope,
      establishmentId,
      clientIdForOrg,
      name,
      classification,
      sector,
      portionsYieldInput,
      marginPercentInput,
      taxPercentInput,
      cmvPercentInput,
      scaleTargetInput,
      lines,
    });
  }, [
    recipeScope,
    establishmentId,
    clientIdForOrg,
    name,
    classification,
    sector,
    portionsYieldInput,
    marginPercentInput,
    taxPercentInput,
    cmvPercentInput,
    scaleTargetInput,
    lines,
  ]);

  const isDirty = getSerialized() !== baseline;

  useEffect(() => {
    const d = readRecipeFormDraftFromStorage(draftStorageKey);
    if (d) {
      setStoredDraft(d);
      setLocalDraftBanner(true);
    } else {
      setStoredDraft(null);
      setLocalDraftBanner(false);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const shouldPersistLocal =
    name.trim().length > 0 ||
    lines.some((l) => l.ingredient_name.trim().length > 0);

  useEffect(() => {
    if (!shouldPersistLocal) return;
    const t = window.setTimeout(() => {
      writeRecipeFormDraftToStorage(draftStorageKey, {
        recipeScope,
        clientIdForOrg,
        establishmentId,
        name,
        classification,
        sector,
        portionsYieldInput,
        marginPercentInput,
        taxPercentInput,
        cmvPercentInput,
        scaleTargetInput,
        lines: lines.map((l) => ({
          ingredient_name: l.ingredient_name,
          quantity: l.quantity,
          unit: l.unit,
          notes: l.notes,
          taco_food_id: l.taco_food_id,
          taco_food: l.taco_food,
          raw_material_id: l.raw_material_id,
          correction_factor: l.correction_factor,
          cooking_factor: l.cooking_factor,
        })),
      });
    }, 650);
    return () => window.clearTimeout(t);
  }, [
    draftStorageKey,
    shouldPersistLocal,
    recipeScope,
    clientIdForOrg,
    establishmentId,
    name,
    classification,
    sector,
    portionsYieldInput,
    marginPercentInput,
    taxPercentInput,
    cmvPercentInput,
    scaleTargetInput,
    lines,
  ]);

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

  function applyPortionYieldScale() {
    setError(null);
    const pyRaw = portionsYieldInput.replace(/\D/g, "");
    const current = parseInt(pyRaw || "1", 10);
    const targetRaw = scaleTargetInput.replace(/\D/g, "");
    const target = parseInt(targetRaw || "0", 10);
    const scaled = scaleIngredientQuantitiesForPortionYield({
      currentPortions: current,
      targetPortions: target,
      lineQuantities: lines.map((l) => l.quantity),
    });
    if (!scaled.ok) {
      const msg =
        scaled.reason === "invalid_current"
          ? "Rendimento atual inválido (use ≥ 1 porção no resumo)."
          : scaled.reason === "invalid_target"
            ? "Indique um novo rendimento válido (número inteiro ≥ 1)."
            : "Adicione ingredientes antes de escalonar.";
      setError(msg);
      return;
    }
    setLines((prev) =>
      prev.map((row, i) => ({
        ...row,
        quantity: scaled.quantities[i] ?? row.quantity,
      })),
    );
    setPortionsYieldInput(String(target));
    setScaleTargetInput("");
  }

  function discardLocalDraft() {
    removeRecipeFormDraftFromStorage(draftStorageKey);
    setStoredDraft(null);
    setLocalDraftBanner(false);
    setDraftPreviewOpen(false);
  }

  function restoreLocalDraft() {
    if (!storedDraft) return;
    if (isDirty) {
      if (
        !window.confirm(
          "Substituir as alterações atuais pelo rascunho guardado neste navegador?",
        )
      ) {
        return;
      }
    }
    const nextEstablishmentId = !isEdit
      ? storedDraft.establishmentId
      : establishmentId;
    const nextScope = storedDraft.recipeScope ?? "establishment";
    const nextClientOrg = storedDraft.clientIdForOrg ?? clientIdForOrg;
    if (!isEdit) {
      setRecipeScope(nextScope);
      setClientIdForOrg(nextClientOrg);
      setEstablishmentId(storedDraft.establishmentId);
    }
    const nextLines = linesFromStoredDraft(storedDraft, rawMaterials);
    setName(storedDraft.name);
    setClassification(storedDraft.classification);
    setSector(storedDraft.sector);
    setPortionsYieldInput(storedDraft.portionsYieldInput);
    setMarginPercentInput(storedDraft.marginPercentInput);
    setTaxPercentInput(storedDraft.taxPercentInput);
    setCmvPercentInput(storedDraft.cmvPercentInput);
    setScaleTargetInput(storedDraft.scaleTargetInput);
    setLines(nextLines);
    setError(null);
      setBaseline(
        serializeRecipeFormState({
          recipeScope: !isEdit ? nextScope : recipeScope,
          establishmentId: nextEstablishmentId,
          clientIdForOrg: !isEdit ? nextClientOrg : clientIdForOrg,
          name: storedDraft.name,
          classification: storedDraft.classification,
          sector: storedDraft.sector,
          portionsYieldInput: storedDraft.portionsYieldInput,
          marginPercentInput: storedDraft.marginPercentInput,
          taxPercentInput: storedDraft.taxPercentInput,
          cmvPercentInput: storedDraft.cmvPercentInput,
          scaleTargetInput: storedDraft.scaleTargetInput,
          lines: nextLines,
        }),
      );
    setDraftPreviewOpen(false);
  }

  function applyTemplateFromPicker(templateId: string) {
    setError(null);
    if (templateLoading) return;
    setTemplateLoading(true);
    void (async () => {
      try {
        const result = await loadTemplateDataForNewRecipeAction(
          templateId,
          recipeScope === "establishment"
            ? { targetEstablishmentId: establishmentId }
            : { targetClientId: clientIdForOrg },
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const tpl = result.recipe;
        const nextLines = linesFromRecipe(tpl);
        setName(tpl.name);
        setClassification(tpl.classification ?? "");
        setSector(tpl.sector ?? "");
        setPortionsYieldInput(String(tpl.portions_yield));
        setMarginPercentInput(String(tpl.margin_percent));
        setTaxPercentInput(String(tpl.tax_percent));
        setCmvPercentInput(String(tpl.cmv_percent ?? 25));
        setScaleTargetInput("");
        setLines(nextLines);
        setBaseline(
          serializeRecipeFormState({
            recipeScope,
            establishmentId,
            clientIdForOrg,
            name: tpl.name,
            classification: tpl.classification ?? "",
            sector: tpl.sector ?? "",
            portionsYieldInput: String(tpl.portions_yield),
            marginPercentInput: String(tpl.margin_percent),
            taxPercentInput: String(tpl.tax_percent),
            cmvPercentInput: String(tpl.cmv_percent ?? 25),
            scaleTargetInput: "",
            lines: nextLines,
          }),
        );
      } finally {
        setTemplateLoading(false);
      }
    })();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const targetStatus = saveIntentRef.current;
    saveIntentRef.current = "draft";
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

    const pyRaw = portionsYieldInput.replace(/\D/g, "");
    const portions_yield = (() => {
      const n = parseInt(pyRaw || "1", 10);
      if (!Number.isFinite(n) || n < 1) return 1;
      return Math.min(999_999, n);
    })();
    const margin_percent = (() => {
      const n = parseFloat(marginPercentInput.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.min(1000, n);
    })();
    const tax_percent = (() => {
      const n = parseFloat(taxPercentInput.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.min(100, n);
    })();
    const cmv_percent = (() => {
      const n = parseFloat(cmvPercentInput.replace(",", "."));
      if (!Number.isFinite(n) || n < 0.1) return 25;
      return Math.min(100, n);
    })();

    setSaving(true);
    let skipSavingReset = false;
    try {
      const result = await saveTechnicalRecipeDraftAction({
        recipeId: recipe?.id,
        ...(recipeScope === "establishment"
          ? { establishmentId }
          : { clientId: clientIdForOrg }),
        name: name.trim(),
        classification: classification || undefined,
        sector: sector.trim() || undefined,
        portions_yield,
        margin_percent,
        tax_percent,
        cmv_percent,
        lines: payloadLines,
        status: targetStatus,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      removeRecipeFormDraftFromStorage(
        recipeFormDraftStorageKey(
          isEdit ? "edit" : "new",
          recipe?.id,
          recipeScope === "org"
            ? {
                kind: "org",
                clientId: clientIdForOrg || pjClients[0]?.id || "__none__",
              }
            : {
                kind: "establishment",
                establishmentId:
                  establishmentId || establishments[0]?.id || "__none__",
              },
        ),
      );

      if (!isEdit) {
        skipSavingReset = true;
        router.replace(`/ficha-tecnica/${result.recipeId}/editar`);
        return;
      }

      setLocalDraftBanner(false);
      setStoredDraft(null);
      setLastTotals(
        (result.status === "published"
          ? "Receita publicada. "
          : "Rascunho salvo. ") + result.totalsLabel,
      );
      setBaseline(
        serializeRecipeFormState({
          recipeScope,
          establishmentId,
          clientIdForOrg,
          name: name.trim(),
          classification,
          sector,
          portionsYieldInput,
          marginPercentInput,
          taxPercentInput,
          cmvPercentInput,
          scaleTargetInput,
          lines,
        }),
      );
      router.refresh();
    } finally {
      if (!skipSavingReset) {
        setSaving(false);
      }
    }
  }

  if (establishments.length === 0 && pjClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem clientes PJ</CardTitle>
          <CardDescription>
            As receitas de ficha técnica usam clientes pessoa jurídica: pode
            associar a um estabelecimento ou guardar no repositório de receitas
            (reutilizável entre estabelecimentos). Crie um cliente PJ para
            continuar.
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

  function pjClientLabel(c: ClientRow): string {
    const t = c.trade_name?.trim();
    return t && t.length > 0 ? t : c.legal_name;
  }

  const storedDraftEst = storedDraft
    ? establishments.find((e) => e.id === storedDraft.establishmentId)
    : undefined;
  const storedDraftIsOrg =
    storedDraft?.recipeScope === "org" ||
    (!storedDraft?.establishmentId?.trim() &&
      Boolean(storedDraft?.clientIdForOrg?.trim()));
  const storedDraftOrgClient = storedDraftIsOrg
    ? pjClients.find(
        (c) => c.id === (storedDraft?.clientIdForOrg ?? "").trim(),
      )
    : undefined;
  const storedDraftEstLabel = storedDraftEst
    ? `${establishmentClientLabel(storedDraftEst)} — ${storedDraftEst.name}`
    : storedDraftOrgClient
      ? `${pjClientLabel(storedDraftOrgClient)} — repositório de receitas`
      : (storedDraft?.establishmentId ??
        storedDraft?.clientIdForOrg ??
        "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RecipeTemplatePickerDialog
        pickerQuery={
          recipeScope === "establishment"
            ? { establishmentId }
            : { clientId: clientIdForOrg }
        }
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelectTemplate={applyTemplateFromPicker}
      />

      <Dialog open={draftPreviewOpen} onOpenChange={setDraftPreviewOpen}>
        <DialogContent className="max-h-[min(90dvh,560px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
            <DialogTitle>Rascunho guardado no navegador</DialogTitle>
            <DialogDescription>
              Pré-visualização dos dados em cache local. Pode restaurar no
              formulário ou descartar.
            </DialogDescription>
          </DialogHeader>
          {storedDraft ? (
            <div className="text-muted-foreground max-h-[50vh] space-y-3 overflow-y-auto px-6 py-4 text-sm">
              <p>
                <span className="text-foreground font-medium">Nome:</span>{" "}
                {storedDraft.name || "—"}
              </p>
              <p>
                <span className="text-foreground font-medium">Contexto:</span>{" "}
                {storedDraftEstLabel ||
                  storedDraft.establishmentId ||
                  storedDraft.clientIdForOrg ||
                  "—"}
              </p>
              <p>
                <span className="text-foreground font-medium">
                  Ingredientes ({storedDraft.lines.length}):
                </span>
              </p>
              <ul className="border-border list-inside list-disc border-l-2 pl-3">
                {storedDraft.lines.slice(0, 12).map((l, i) => (
                  <li key={i}>
                    {l.ingredient_name.trim() || "—"} — {l.quantity}{" "}
                    {l.unit}
                  </li>
                ))}
                {storedDraft.lines.length > 12 ? (
                  <li className="list-none">…</li>
                ) : null}
              </ul>
              <p className="text-xs opacity-80">
                Guardado em:{" "}
                {new Date(storedDraft.savedAt).toLocaleString("pt-BR")}
              </p>
            </div>
          ) : null}
          <DialogFooter className="border-border shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftPreviewOpen(false)}
            >
              Fechar
            </Button>
            <Button type="button" variant="destructive" onClick={discardLocalDraft}>
              Descartar rascunho local
            </Button>
            <Button type="button" onClick={restoreLocalDraft}>
              Restaurar no formulário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {localDraftBanner && storedDraft ? (
        <Alert>
          <AlertTitle>Rascunho local encontrado</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="min-w-0 flex-1">
              Existem dados guardados neste navegador para este formulário (por
              exemplo após perda de ligação). Pode pré-visualizar, restaurar ou
              descartar.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDraftPreviewOpen(true)}
              >
                Ver conteúdo guardado
              </Button>
              <Button type="button" size="sm" onClick={restoreLocalDraft}>
                Restaurar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={discardLocalDraft}
              >
                Descartar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <RecipeFormIntroductionSections />

      {!isEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setTemplatePickerOpen(true)}
            disabled={
              saving ||
              templateLoading ||
              (recipeScope === "establishment" && !establishmentId.trim()) ||
              (recipeScope === "org" && !clientIdForOrg.trim())
            }
          >
            <LayoutTemplate className="size-4" aria-hidden />
            Utilizar template
          </Button>
          <p className="text-muted-foreground text-sm">
            Preenche a partir de um template ou favorito do mesmo cliente PJ;
            edite antes de salvar.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados da receita</CardTitle>
          <CardDescription>
            Identificação e contexto (estabelecimento ou repositório de
            receitas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEdit &&
          establishments.length > 0 &&
          pjClients.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className={cn("text-sm font-medium", fieldLabelClassName)}>
                Onde fica esta receita?
              </legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="border-input bg-background text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs has-[:checked]:ring-ring has-[:checked]:ring-2">
                  <input
                    type="radio"
                    name="recipe-scope"
                    className="accent-primary"
                    checked={recipeScope === "establishment"}
                    onChange={() => {
                      setRecipeScope("establishment");
                      setEstablishmentId((prev) =>
                        prev.trim().length > 0
                          ? prev
                          : (establishments[0]?.id ?? ""),
                      );
                    }}
                  />
                  Estabelecimento
                </label>
                <label className="border-input bg-background text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs has-[:checked]:ring-ring has-[:checked]:ring-2">
                  <input
                    type="radio"
                    name="recipe-scope"
                    className="accent-primary"
                    checked={recipeScope === "org"}
                    onChange={() => {
                      setRecipeScope("org");
                      setEstablishmentId("");
                      setClientIdForOrg((prev) =>
                        prev.trim().length > 0
                          ? prev
                          : (pjClients[0]?.id ?? ""),
                      );
                    }}
                  />
                  Repositório de Receitas
                </label>
              </div>
            </fieldset>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="recipe-name"
                className={fieldLabelClassName}
              >
                Nome da receita
              </Label>
              <Input
                id="recipe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Sopa de legumes — lote base"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              {recipeScope === "org" ? (
                // Repositório de Receitas — sem seleção de cliente.
                // O client_id é preenchido automaticamente (FK obrigatória da BD)
                // mas não é exposto ao utilizador: a receita fica acessível a todo o tenant.
                <p className="text-muted-foreground pt-1 text-sm">
                  Ficará disponível como modelo para todos os estabelecimentos.
                </p>
              ) : (
                <>
                  <Label
                    htmlFor="recipe-establishment"
                    className={fieldLabelClassName}
                  >
                    Estabelecimento
                  </Label>
                  {isEdit ? (
                    <p
                      id="recipe-establishment"
                      className="text-foreground text-sm"
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
                </>
              )}
            </div>
          </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="recipe-classification"
            className={fieldLabelClassName}
          >
            Classificação
          </Label>
          <select
            id="recipe-classification"
            className={selectClassName}
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          >
            <option value="">— Selecione —</option>
            <option value="bebida">Bebida</option>
            <option value="entrada">Entrada</option>
            <option value="prato-principal">Prato principal</option>
            <option value="sobremesa">Sobremesa</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-sector" className={fieldLabelClassName}>
            Setor
          </Label>
          <Input
            id="recipe-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Ex.: Cozinha fria, Cozinha quente"
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipe-cmv" className={fieldLabelClassName}>
            CMV% (Custo dos Materiais Vendidos)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="recipe-cmv"
              inputMode="decimal"
              value={cmvPercentInput}
              onChange={(e) => setCmvPercentInput(e.target.value)}
              placeholder="25"
              className="flex-1"
            />
            <span className="text-muted-foreground">%</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Padrão: 25%. Ajuste conforme sua margem desejada (20%, 30%, etc).
          </p>
        </div>
      </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base">Ingredientes</CardTitle>
                  <CardDescription>
                    Quantidade e unidade; associe{" "}
                    <Link
                      href="/ficha-tecnica/materias-primas"
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      matéria-prima
                    </Link>{" "}
                    para custo e TACO para nutrição.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="size-4" />
                  Linha
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Escalonar por rendimento (regra de três)
                </CardTitle>
                <CardDescription>
                  Multiplica todas as quantidades pelo factor{" "}
                  <span className="text-foreground font-medium">
                    novo rendimento ÷ rendimento atual
                  </span>
                  . O rendimento atual é o valor «Rendimento (porções)» no
                  resumo à direita.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5 sm:max-w-[12rem]">
                  <Label
                    htmlFor="recipe-scale-target"
                    className={fieldLabelClassName}
                  >
                    Novo rendimento (porções)
                  </Label>
                  <Input
                    id="recipe-scale-target"
                    inputMode="numeric"
                    value={scaleTargetInput}
                    onChange={(e) => setScaleTargetInput(e.target.value)}
                    placeholder="Ex.: 20"
                    min={1}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={applyPortionYieldScale}
                >
                  Aplicar às quantidades
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:grid sm:grid-cols-[1fr_120px_140px_auto] sm:items-end"
            >
              <div className="space-y-1.5 sm:col-span-1">
                <Label
                  className={cn("text-xs", fieldLabelClassName)}
                  htmlFor={`ing-${line.key}`}
                >
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
                <Label
                  className={cn("text-xs", fieldLabelClassName)}
                  htmlFor={`qty-${line.key}`}
                >
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
                <Label
                  className={cn("text-xs", fieldLabelClassName)}
                  htmlFor={`unit-${line.key}`}
                >
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
                  <Label
                    className={cn("text-xs", fieldLabelClassName)}
                    htmlFor={`corr-${line.key}`}
                  >
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
                  <Label
                    className={cn("text-xs", fieldLabelClassName)}
                    htmlFor={`cook-${line.key}`}
                  >
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
                <Label
                  className={cn("text-xs", fieldLabelClassName)}
                  htmlFor={`notes-${line.key}`}
                >
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
                    <Label
                      className={cn("text-xs", fieldLabelClassName)}
                      htmlFor={`rm-${line.key}`}
                    >
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
            </CardContent>
          </Card>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-muted-foreground max-w-xl text-xs">
              <span className="text-foreground font-medium">Salvar rascunho</span>{" "}
              mantém a ficha em trabalho (não publicada).{" "}
              <span className="text-foreground font-medium">Salvar receita</span>{" "}
              publica a receita como pronta para uso.
              {isEdit && recipe ? (
                <>
                  {" "}
                  Estado neste momento:{" "}
                  <span className="text-foreground font-medium">
                    {recipe.status === "published" ? "publicada" : "rascunho"}
                  </span>
                  .
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={saving}
              onClick={() => {
                saveIntentRef.current = "draft";
              }}
            >
              {saving ? "A salvar…" : "Salvar rascunho"}
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={saving}
              onClick={() => {
                saveIntentRef.current = "published";
              }}
            >
              {saving ? "A salvar…" : "Salvar receita"}
            </Button>
            <Link
              href="/ficha-tecnica"
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={(e) => {
                if (
                  isDirty &&
                  !window.confirm(
                    "Tem alterações não salvas. Se sair, as alterações serão perdidas.",
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              Cancelar
            </Link>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:z-10 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
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
                  Último salvo: {lastTotals}
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
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
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

          <CostSummaryPanel
            totalMaterialCostBrl={costPreview.totalBrl}
            linesWithCost={costPreview.linesWithCost}
            skippedDimension={costPreview.skippedDimension}
            recipeNutritionTotals={nutritionPreview}
            portionsYieldInput={portionsYieldInput}
            onPortionsYieldInputChange={setPortionsYieldInput}
            marginPercentInput={marginPercentInput}
            onMarginPercentInputChange={setMarginPercentInput}
            taxPercentInput={taxPercentInput}
            onTaxPercentInputChange={setTaxPercentInput}
            cmvPercentInput={cmvPercentInput}
            onCmvPercentInputChange={setCmvPercentInput}
          />
        </aside>
      </div>
    </form>
  );
}
