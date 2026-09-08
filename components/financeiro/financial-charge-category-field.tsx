"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFinancialChargeCategoryAction,
  type FinancialChargeCustomCategory,
} from "@/lib/actions/financial-charge-categories";
import {
  FINANCIAL_CHARGE_BUILT_IN_CATEGORIES,
  financialChargeBuiltInCategoryLabel,
  isFinancialChargeBuiltInCategory,
} from "@/lib/constants/financial-charge-category";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  customCategories?: FinancialChargeCustomCategory[];
  required?: boolean;
};

function categoryDisplayLabel(
  value: string,
  customCategories: FinancialChargeCustomCategory[],
): string {
  if (isFinancialChargeBuiltInCategory(value)) {
    return financialChargeBuiltInCategoryLabel[value];
  }
  return customCategories.find((c) => c.label === value)?.label ?? value;
}

export function FinancialChargeCategoryField({
  id: idProp,
  name = "category",
  customCategories: initialCustom = [],
  required = true,
}: Props) {
  const reactId = useId();
  const id = idProp ?? `fc-category-${reactId}`;
  const createInputId = `${id}-nova`;
  const requiredInputRef = useRef<HTMLInputElement>(null);

  const [customCategories, setCustomCategories] = useState(initialCustom);
  const [value, setValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const el = requiredInputRef.current;
    if (!el) return;
    el.setCustomValidity(
      required && !value ? "Selecione uma categoria da cobrança." : "",
    );
  }, [required, value]);

  function handleCreate() {
    setCreateError(null);
    startTransition(async () => {
      const result = await createFinancialChargeCategoryAction(newLabel);
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setCustomCategories((prev) => {
        const already = prev.some((c) => c.id === result.category.id);
        return already
          ? prev
          : [...prev, result.category].sort((a, b) =>
              a.label.localeCompare(b.label, "pt", { sensitivity: "base" }),
            );
      });
      setValue(result.category.label);
      setNewLabel("");
      setCreating(false);
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        Categoria
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="flex gap-2">
        <input
          ref={requiredInputRef}
          type="text"
          name={name}
          value={value}
          required={required}
          tabIndex={-1}
          aria-label="Categoria da cobrança"
          className="sr-only"
          onChange={() => undefined}
        />
        <Select
          value={value || undefined}
          onValueChange={(next) => {
            if (next) setValue(next);
          }}
        >
          <SelectTrigger
            id={id}
            className={cn("min-w-0 flex-1", required && !value && "border-destructive/50")}
            aria-required={required || undefined}
          >
            <SelectValue placeholder="Escolher categoria…">
              {(selected) =>
                selected
                  ? categoryDisplayLabel(selected, customCategories)
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FINANCIAL_CHARGE_BUILT_IN_CATEGORIES.map((key) => (
              <SelectItem key={key} value={key}>
                {financialChargeBuiltInCategoryLabel[key]}
              </SelectItem>
            ))}
            {customCategories.length > 0 ? (
              <>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                  Personalizadas
                </div>
                {customCategories.map((category) => (
                  <SelectItem key={category.id} value={category.label}>
                    {category.label}
                  </SelectItem>
                ))}
              </>
            ) : null}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Criar nova categoria"
          aria-label="Criar nova categoria de cobrança"
          aria-expanded={creating}
          onClick={() => {
            setCreating((open) => !open);
            setCreateError(null);
            setNewLabel("");
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {creating ? (
        <div className="border-border space-y-2 rounded-lg border bg-muted/20 p-3">
          <Label htmlFor={createInputId} className="text-sm font-medium">
            Nome da nova categoria
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={createInputId}
              value={newLabel}
              maxLength={80}
              placeholder="Ex.: Treinamento, Palestra…"
              disabled={pending}
              autoFocus
              onChange={(e) => {
                setNewLabel(e.target.value);
                setCreateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="sm:self-center"
              disabled={pending || newLabel.trim().length === 0}
              onClick={handleCreate}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Criar
            </Button>
          </div>
          {createError ? (
            <p className="text-destructive text-xs" role="alert">
              {createError}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Fica disponível neste workspace para as próximas cobranças e
              relatórios.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Agrupa a cobrança nos relatórios. Use <strong>+</strong> para criar
          uma categoria extra.
        </p>
      )}
    </div>
  );
}
