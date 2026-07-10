"use client";

// Gestão das séries/turmas de um cliente-escola (categoria "escola"). Mesmo
// padrão visual de EstablishmentAreasSection, sem reordenação manual (a
// ordem de criação já basta para o uso — lista curta por escola).

import { useCallback, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createGradeAction,
  deleteGradeAction,
  renameGradeAction,
} from "@/lib/actions/school-grades";
import type { ClientSchoolGradeOption } from "@/lib/types/school-grades";

type Props = {
  clientId: string;
  initialGrades: ClientSchoolGradeOption[];
};

type EditState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "editing"; gradeId: string };

function GradeItem({
  grade,
  onEdit,
  onDelete,
  isPending,
}: {
  grade: ClientSchoolGradeOption;
  onEdit: (grade: ClientSchoolGradeOption) => void;
  onDelete: (gradeId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm transition-colors">
      <span className="flex-1 font-medium text-foreground truncate">{grade.name}</span>
      <button
        type="button"
        aria-label={`Editar série ${grade.name}`}
        disabled={isPending}
        onClick={() => onEdit(grade)}
        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Remover série ${grade.name}`}
        disabled={isPending}
        onClick={() => onDelete(grade.id)}
        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function GradeForm({
  defaultName = "",
  submitLabel,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultName?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(defaultName);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onSubmit(n);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3"
    >
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da série (ex.: Maternal II, 3º ano B)"
        maxLength={80}
        required
        disabled={isPending}
        className="h-8 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
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

export function SchoolGradesSection({ clientId, initialGrades }: Props) {
  const [grades, setGrades] = useState<ClientSchoolGradeOption[]>(initialGrades);
  const [editState, setEditState] = useState<EditState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setGrades(initialGrades);
  }, [initialGrades]);

  const clearError = useCallback(() => setError(null), []);

  function handleCreate(name: string) {
    clearError();
    startTransition(async () => {
      const result = await createGradeAction(clientId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGrades((prev) => [...prev, { id: `tmp-${Date.now()}`, name }]);
      setEditState({ kind: "idle" });
    });
  }

  function handleUpdate(gradeId: string, name: string) {
    clearError();
    startTransition(async () => {
      const result = await renameGradeAction(gradeId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGrades((prev) => prev.map((g) => (g.id === gradeId ? { ...g, name } : g)));
      setEditState({ kind: "idle" });
    });
  }

  function handleDelete(gradeId: string) {
    if (
      !window.confirm(
        "Remover esta série? Pacientes associados a ela ficarão sem série definida.",
      )
    )
      return;
    clearError();
    startTransition(async () => {
      const result = await deleteGradeAction(gradeId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGrades((prev) => prev.filter((g) => g.id !== gradeId));
      setEditState({ kind: "idle" });
    });
  }

  return (
    <section aria-labelledby="school-grades-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="school-grades-heading" className="text-foreground text-base font-semibold tracking-tight">
          Séries / turmas
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
            Adicionar série
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Cadastre as séries/turmas desta escola (ex.: Maternal II, 3º ano B). No
        cadastro de cada paciente desta escola, a série vira uma lista fixa —
        assim evita nomes divergentes para a mesma turma. Campo opcional.
      </p>

      {error && (
        <p
          role="alert"
          className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
        >
          {error}
        </p>
      )}

      {grades.length === 0 && editState.kind !== "adding" ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Nenhuma série cadastrada ainda.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditState({ kind: "adding" })}
            disabled={isPending}
          >
            <Plus className="size-3.5 mr-1" />
            Adicionar primeira série
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {grades.map((grade) => (
            <li key={grade.id}>
              {editState.kind === "editing" && editState.gradeId === grade.id ? (
                <GradeForm
                  defaultName={grade.name}
                  submitLabel="Salvar"
                  onSubmit={(name) => handleUpdate(grade.id, name)}
                  onCancel={() => setEditState({ kind: "idle" })}
                  isPending={isPending}
                />
              ) : (
                <GradeItem
                  grade={grade}
                  onEdit={(g) => setEditState({ kind: "editing", gradeId: g.id })}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editState.kind === "adding" && (
        <GradeForm
          submitLabel="Criar série"
          onSubmit={handleCreate}
          onCancel={() => setEditState({ kind: "idle" })}
          isPending={isPending}
        />
      )}
    </section>
  );
}
