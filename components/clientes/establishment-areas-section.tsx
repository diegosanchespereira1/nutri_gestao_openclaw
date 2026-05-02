"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Trash2, X, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAreaAction,
  deleteAreaAction,
  reorderAreasAction,
  updateAreaAction,
} from "@/lib/actions/establishment-areas";
import type { EstablishmentAreaOption } from "@/lib/types/establishment-areas";

type Props = {
  establishmentId: string;
  initialAreas: EstablishmentAreaOption[];
};

type EditState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "editing"; areaId: string };

/* ─── item de área ───────────────────────────────────────────────────────── */

function AreaItem({
  area,
  onEdit,
  onDelete,
  isPending,
}: {
  area: EstablishmentAreaOption;
  onEdit: (area: EstablishmentAreaOption) => void;
  onDelete: (areaId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm transition-colors">
      <GripVertical className="size-4 shrink-0 text-muted-foreground/50 cursor-grab" aria-hidden />
      <span className="flex-1 font-medium text-foreground truncate">{area.name}</span>
      {area.description ? (
        <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[200px]">
          {area.description}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`Editar área ${area.name}`}
        disabled={isPending}
        onClick={() => onEdit(area)}
        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Remover área ${area.name}`}
        disabled={isPending}
        onClick={() => onDelete(area.id)}
        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/* ─── formulário inline de criar/editar ─────────────────────────────────── */

function AreaForm({
  defaultName = "",
  defaultDescription = "",
  submitLabel,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultName?: string;
  defaultDescription?: string;
  submitLabel: string;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [desc, setDesc] = useState(defaultDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onSubmit(n, desc.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3"
    >
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da área (ex.: Área de Preparo Quente)"
        maxLength={120}
        required
        disabled={isPending}
        className="h-8 text-sm"
      />
      <Input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Descrição opcional"
        maxLength={300}
        disabled={isPending}
        className="h-8 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          <X className="size-3.5 mr-1" /> Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="size-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="size-3.5 mr-1" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/* ─── componente principal ───────────────────────────────────────────────── */

export function EstablishmentAreasSection({ establishmentId, initialAreas }: Props) {
  const [areas, setAreas] = useState<EstablishmentAreaOption[]>(initialAreas);
  const [editState, setEditState] = useState<EditState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sincroniza quando o servidor revalida e passa novas initialAreas via RSC
  useEffect(() => {
    setAreas(initialAreas);
  }, [initialAreas]);

  const clearError = useCallback(() => setError(null), []);

  /* ── criar área ── */
  function handleCreate(name: string, description: string) {
    clearError();
    startTransition(async () => {
      const result = await createAreaAction(establishmentId, name, description || null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Adiciona otimisticamente — RSC revalidará e sobrescreverá
      setAreas((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          name,
          description: description || null,
          position: prev.length,
        },
      ]);
      setEditState({ kind: "idle" });
    });
  }

  /* ── editar área ── */
  function handleUpdate(areaId: string, name: string, description: string) {
    clearError();
    startTransition(async () => {
      const result = await updateAreaAction(areaId, name, description || null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAreas((prev) =>
        prev.map((a) =>
          a.id === areaId ? { ...a, name, description: description || null } : a,
        ),
      );
      setEditState({ kind: "idle" });
    });
  }

  /* ── remover área ── */
  function handleDelete(areaId: string) {
    if (!window.confirm("Remover esta área? Sessões de checklist vinculadas ficarão sem área associada.")) return;
    clearError();
    startTransition(async () => {
      const result = await deleteAreaAction(areaId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAreas((prev) => prev.filter((a) => a.id !== areaId));
      setEditState({ kind: "idle" });
    });
  }

  /* ── reordenar (mover ↑↓) ── */
  function handleMove(areaId: string, direction: "up" | "down") {
    setAreas((prev) => {
      const idx = prev.findIndex((a) => a.id === areaId);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      // Persistir nova ordem em background
      startTransition(async () => {
        await reorderAreasAction(establishmentId, next.map((a) => a.id));
      });
      return next.map((a, i) => ({ ...a, position: i }));
    });
  }

  return (
    <section aria-labelledby="areas-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="areas-heading"
          className="text-foreground text-base font-semibold tracking-tight"
        >
          Áreas disponíveis
        </h2>
        {editState.kind === "idle" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditState({ kind: "adding" })}
            disabled={isPending}
          >
            <Plus className="size-3.5 mr-1" />
            Adicionar área
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Defina as áreas físicas deste estabelecimento (ex.: Preparo Quente, Almoxarifado).
        Cada área receberá o checklist de forma independente, gerando pontuações e dossiês separados.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      {/* Lista de áreas */}
      {areas.length === 0 && editState.kind !== "adding" ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Nenhuma área cadastrada. Adicione as áreas físicas para aplicar checklists por ambiente.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditState({ kind: "adding" })}
            disabled={isPending}
          >
            <Plus className="size-3.5 mr-1" />
            Adicionar primeira área
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {areas.map((area, idx) => (
            <li key={area.id}>
              {editState.kind === "editing" && editState.areaId === area.id ? (
                <AreaForm
                  defaultName={area.name}
                  defaultDescription={area.description ?? ""}
                  submitLabel="Salvar"
                  onSubmit={(name, desc) => handleUpdate(area.id, name, desc)}
                  onCancel={() => setEditState({ kind: "idle" })}
                  isPending={isPending}
                />
              ) : (
                <div className="flex items-center gap-1">
                  {/* Botões de reordenação */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Mover para cima"
                      disabled={idx === 0 || isPending}
                      onClick={() => handleMove(area.id, "up")}
                      className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
                    >
                      <svg className="size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2L10 8H2L6 2Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Mover para baixo"
                      disabled={idx === areas.length - 1 || isPending}
                      onClick={() => handleMove(area.id, "down")}
                      className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
                    >
                      <svg className="size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M6 10L2 4H10L6 10Z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1">
                    <AreaItem
                      area={area}
                      onEdit={(a) => setEditState({ kind: "editing", areaId: a.id })}
                      onDelete={handleDelete}
                      isPending={isPending}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Formulário de adição */}
      {editState.kind === "adding" && (
        <AreaForm
          submitLabel="Criar área"
          onSubmit={handleCreate}
          onCancel={() => setEditState({ kind: "idle" })}
          isPending={isPending}
        />
      )}
    </section>
  );
}
