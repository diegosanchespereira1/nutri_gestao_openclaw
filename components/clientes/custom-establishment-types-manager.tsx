"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEstablishmentCustomTypeAction,
  deleteEstablishmentCustomTypeAction,
  updateEstablishmentCustomTypeAction,
  type EstablishmentCustomType,
} from "@/lib/actions/establishment-custom-types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_TYPES_BY_CATEGORY,
  establishmentCategoryLabel,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory } from "@/lib/types/establishments";

export function CustomEstablishmentTypesManager({
  initial,
  canEdit = false,
}: {
  initial: EstablishmentCustomType[];
  canEdit?: boolean;
}) {
  const [types, setTypes] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [creatingCategory, setCreatingCategory] =
    useState<EstablishmentCategory | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(row: EstablishmentCustomType) {
    setCreatingCategory(null);
    setEditingId(row.id);
    setEditLabel(row.label);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setError(null);
  }

  function handleSave(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateEstablishmentCustomTypeAction({
        id,
        label: editLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTypes((prev) =>
        prev
          .map((t) => (t.id === id ? { ...t, label: result.type.label } : t))
          .sort((a, b) =>
            a.label.localeCompare(b.label, "pt", { sensitivity: "base" }),
          ),
      );
      setEditingId(null);
    });
  }

  function handleDelete(id: string, label: string) {
    if (
      !window.confirm(
        `Eliminar o tipo "${label}"?\n\nSó é possível se nenhum estabelecimento o estiver a usar.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteEstablishmentCustomTypeAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTypes((prev) => prev.filter((t) => t.id !== id));
    });
  }

  function openCreate(category: EstablishmentCategory) {
    setEditingId(null);
    setCreatingCategory(category);
    setNewLabel("");
    setError(null);
  }

  function cancelCreate() {
    setCreatingCategory(null);
    setNewLabel("");
    setError(null);
  }

  function handleCreate(category: EstablishmentCategory) {
    setError(null);
    startTransition(async () => {
      const result = await createEstablishmentCustomTypeAction({
        label: newLabel,
        category,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTypes((prev) => {
        const already = prev.some((t) => t.id === result.type.id);
        return already
          ? prev
          : [...prev, result.type].sort((a, b) =>
              a.label.localeCompare(b.label, "pt", { sensitivity: "base" }),
            );
      });
      setCreatingCategory(null);
      setNewLabel("");
    });
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {ESTABLISHMENT_CATEGORIES.map((category) => {
        const customInCategory = types.filter((t) => t.category === category);
        const builtins = ESTABLISHMENT_TYPES_BY_CATEGORY[category];
        const isCreating = creatingCategory === category;

        return (
          <section key={category} className="space-y-4">
            <h2 className="text-foreground text-sm font-semibold">
              {establishmentCategoryLabel[category]}
            </h2>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Personalizados
                </h3>
                {canEdit && !isCreating ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCreate(category)}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Criar tipo
                  </Button>
                ) : null}
              </div>

              {canEdit && isCreating ? (
                <div className="border-border bg-card flex items-center gap-2 rounded-xl border px-4 py-3">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nome do novo tipo…"
                    className="flex-1"
                    autoFocus
                    maxLength={80}
                    disabled={pending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate(category);
                      if (e.key === "Escape") cancelCreate();
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending || !newLabel.trim()}
                    aria-label="Confirmar"
                    onClick={() => handleCreate(category)}
                  >
                    <Check className="size-4 text-emerald-600" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    aria-label="Cancelar"
                    onClick={cancelCreate}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}

              {customInCategory.length === 0 && !isCreating ? (
                <div className="border-border bg-muted/30 rounded-xl border border-dashed px-4 py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    {canEdit
                      ? "Nenhum tipo personalizado nesta categoria."
                      : "Nenhum tipo personalizado criado."}
                  </p>
                </div>
              ) : customInCategory.length > 0 ? (
                <div className="border-border bg-card overflow-hidden rounded-xl border">
                  {customInCategory.map((row) => (
                    <div
                      key={row.id}
                      className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-0"
                    >
                      {canEdit && editingId === row.id ? (
                        <>
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="flex-1"
                            autoFocus
                            maxLength={80}
                            disabled={pending}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(row.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={pending || !editLabel.trim()}
                            aria-label="Guardar"
                            onClick={() => handleSave(row.id)}
                          >
                            <Check className="size-4 text-emerald-600" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={pending}
                            aria-label="Cancelar"
                            onClick={cancelEdit}
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-foreground flex-1 text-sm font-medium">
                            {row.label}
                          </span>
                          {canEdit ? (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Editar "${row.label}"`}
                                onClick={() => startEdit(row)}
                              >
                                <Pencil className="size-4 text-muted-foreground" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Eliminar "${row.label}"`}
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(row.id, row.label)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Sistema
              </h3>
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                {builtins.map((type) => (
                  <div
                    key={type}
                    className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-0"
                  >
                    <span className="text-foreground flex-1 text-sm font-medium">
                      {establishmentTypeLabel[type]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
