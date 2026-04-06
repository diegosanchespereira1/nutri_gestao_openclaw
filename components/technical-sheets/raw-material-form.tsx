import Link from "next/link";

import { saveRawMaterialAction } from "@/lib/actions/raw-materials";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import {
  RECIPE_LINE_UNIT_LABELS,
  RECIPE_LINE_UNITS,
} from "@/lib/constants/recipe-line-units";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  material?: RawMaterialRow | null;
};

export function RawMaterialForm({ material }: Props) {
  const isEdit = Boolean(material);

  return (
    <form action={saveRawMaterialAction} className="max-w-lg space-y-5">
      {isEdit && material ? (
        <input type="hidden" name="id" value={material.id} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="rm-name">Nome da matéria-prima</Label>
        <Input
          id="rm-name"
          name="name"
          required
          maxLength={300}
          defaultValue={material?.name ?? ""}
          placeholder="Ex.: Azeite extra virgem"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rm-price-unit">Unidade do preço</Label>
          <select
            id="rm-price-unit"
            name="price_unit"
            required
            className={cn(
              "border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm",
              "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
            defaultValue={material?.price_unit ?? "kg"}
          >
            {RECIPE_LINE_UNITS.map((u) => (
              <option key={u} value={u}>
                {RECIPE_LINE_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            O valor abaixo é o preço por esta unidade (ex.: R$ por kg).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rm-price">Preço (R$)</Label>
          <Input
            id="rm-price"
            name="unit_price_brl"
            type="text"
            inputMode="decimal"
            required
            defaultValue={
              material != null ? String(material.unit_price_brl) : ""
            }
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rm-notes">Notas (opcional)</Label>
        <textarea
          id="rm-notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={material?.notes ?? ""}
          className={cn(
            "border-input bg-background w-full rounded-lg border px-2.5 py-2 text-sm",
            "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">
          {isEdit ? "Guardar alterações" : "Registar matéria-prima"}
        </Button>
        <Link
          href="/ficha-tecnica/materias-primas"
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
