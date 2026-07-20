"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createEstablishmentCustomTypeAction,
  loadEstablishmentCustomTypesAction,
  type EstablishmentCustomType,
} from "@/lib/actions/establishment-custom-types";
import {
  ESTABLISHMENT_TYPES_BY_CATEGORY,
  establishmentTypeLabel,
  labelForEstablishmentType,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  category: EstablishmentCategory;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Tipos custom pré-carregados (opcional; o select também carrega sozinho). */
  customTypes?: EstablishmentCustomType[];
  allowCreate?: boolean;
};

export function EstablishmentTypeSelect({
  id = "est-type",
  category,
  value,
  onChange,
  className,
  placeholder = "Selecione",
  disabled = false,
  customTypes: customTypesProp,
  allowCreate = true,
}: Props) {
  const [customTypes, setCustomTypes] = useState<EstablishmentCustomType[]>(
    customTypesProp ?? [],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    if (customTypesProp) {
      setCustomTypes(customTypesProp.filter((t) => t.category === category));
    }
    void loadEstablishmentCustomTypesAction(category).then((rows) => {
      if (!cancelled) setCustomTypes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [category, customTypesProp]);

  const builtins = ESTABLISHMENT_TYPES_BY_CATEGORY[category];
  const customsForCategory = customTypes.filter((t) => t.category === category);

  function openCreateDialog() {
    setError(null);
    setNewLabel("");
    setCreateOpen(true);
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createEstablishmentCustomTypeAction({
        label: newLabel,
        category,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCustomTypes((prev) => {
        const already = prev.some((t) => t.id === res.type.id);
        return already
          ? prev
          : [...prev, res.type].sort((a, b) =>
              a.label.localeCompare(b.label, "pt", { sensitivity: "base" }),
            );
      });
      onChange(res.type.slug);
      setCreateOpen(false);
      setNewLabel("");
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Select
          value={value || null}
          disabled={disabled}
          onValueChange={(next) => {
            if (next) onChange(next);
          }}
        >
          <SelectTrigger id={id} className={cn("min-w-0 flex-1", className)}>
            <SelectValue placeholder={placeholder}>
              {(selected) =>
                selected
                  ? labelForEstablishmentType(selected, customsForCategory)
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {builtins.map((type) => (
              <SelectItem key={type} value={type}>
                {establishmentTypeLabel[type]}
              </SelectItem>
            ))}
            {customsForCategory.length > 0 ? (
              <>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                  Personalizados
                </div>
                {customsForCategory.map((type) => (
                  <SelectItem key={type.id} value={type.slug}>
                    {type.label}
                  </SelectItem>
                ))}
              </>
            ) : null}
          </SelectContent>
        </Select>

        {allowCreate && !disabled ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Criar novo tipo"
            aria-label="Criar novo tipo de estabelecimento"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setCreateOpen(open);
          if (!open) {
            setNewLabel("");
            setError(null);
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo tipo de estabelecimento</DialogTitle>
            <DialogDescription>
              O tipo ficará ligado à categoria atual e disponível neste
              workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-new-label`}>Nome do tipo</Label>
              <Input
                id={`${id}-new-label`}
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setError(null);
                }}
                placeholder="Ex.: Cantina escolar"
                maxLength={80}
                disabled={pending}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              {error ? (
                <p className="text-destructive text-xs" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pending || !newLabel.trim()}
              onClick={handleCreate}
            >
              {pending ? "Criando…" : "Criar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
