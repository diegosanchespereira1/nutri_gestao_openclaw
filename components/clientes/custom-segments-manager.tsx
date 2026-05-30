"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCustomSegmentAction,
  deleteCustomSegmentAction,
  updateCustomSegmentAction,
  upsertBuiltInSegmentOverrideAction,
  type ClientCustomSegment,
} from "@/lib/actions/client-segments";

type BuiltInSegment = {
  key: string;
  defaultLabel: string;
  currentLabel: string;
  isOverridden: boolean;
};

export function CustomSegmentsManager({
  initial,
  builtIn,
  canEdit = false,
}: {
  initial: ClientCustomSegment[];
  builtIn: BuiltInSegment[];
  canEdit?: boolean;
}) {
  const [segments, setSegments] = useState(initial);
  const [builtIns, setBuiltIns] = useState(builtIn);

  // Custom segment editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Built-in segment editing state
  const [editingBuiltInKey, setEditingBuiltInKey] = useState<string | null>(null);
  const [editBuiltInLabel, setEditBuiltInLabel] = useState("");

  // Create new custom segment state
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* ── Custom: edit ── */
  function startEdit(seg: ClientCustomSegment) {
    setCreating(false);
    setEditingBuiltInKey(null);
    setEditingId(seg.id);
    setEditLabel(seg.label);
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
      const result = await updateCustomSegmentAction(id, editLabel);
      if (!result.ok) { setError(result.error); return; }
      setSegments((prev) =>
        prev
          .map((s) => (s.id === id ? { ...s, label: result.segment.label } : s))
          .sort((a, b) => a.label.localeCompare(b.label, "pt", { sensitivity: "base" })),
      );
      setEditingId(null);
    });
  }

  /* ── Custom: delete ── */
  function handleDelete(id: string, label: string) {
    if (!window.confirm(`Eliminar a categoria "${label}"?\n\nOs clientes que a utilizam mantêm o valor guardado, mas a categoria deixará de aparecer nas listas.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomSegmentAction(id);
      if (!result.ok) { setError(result.error); return; }
      setSegments((prev) => prev.filter((s) => s.id !== id));
    });
  }

  /* ── Custom: create ── */
  function openCreate() {
    setEditingId(null);
    setEditingBuiltInKey(null);
    setNewLabel("");
    setCreating(true);
    setError(null);
  }
  function cancelCreate() {
    setCreating(false);
    setNewLabel("");
    setError(null);
  }
  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCustomSegmentAction(newLabel);
      if (!result.ok) { setError(result.error); return; }
      setSegments((prev) => {
        const already = prev.some((s) => s.id === result.segment.id);
        return already ? prev : [...prev, result.segment].sort((a, b) => a.label.localeCompare(b.label, "pt", { sensitivity: "base" }));
      });
      setCreating(false);
      setNewLabel("");
    });
  }

  /* ── Built-in: edit ── */
  function startBuiltInEdit(seg: BuiltInSegment) {
    setEditingId(null);
    setCreating(false);
    setEditingBuiltInKey(seg.key);
    setEditBuiltInLabel(seg.currentLabel);
    setError(null);
  }
  function cancelBuiltInEdit() {
    setEditingBuiltInKey(null);
    setEditBuiltInLabel("");
    setError(null);
  }
  function handleBuiltInSave(key: string) {
    setError(null);
    startTransition(async () => {
      const result = await upsertBuiltInSegmentOverrideAction(key, editBuiltInLabel);
      if (!result.ok) { setError(result.error); return; }
      setBuiltIns((prev) =>
        prev.map((s) =>
          s.key === key
            ? { ...s, currentLabel: editBuiltInLabel.trim(), isOverridden: true }
            : s,
        ),
      );
      setEditingBuiltInKey(null);
    });
  }
  function handleBuiltInRestore(key: string, defaultLabel: string) {
    if (!window.confirm(`Restaurar o nome original "${defaultLabel}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertBuiltInSegmentOverrideAction(key, defaultLabel);
      if (!result.ok) { setError(result.error); return; }
      setBuiltIns((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, currentLabel: defaultLabel, isOverridden: false } : s,
        ),
      );
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Personalizadas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Personalizadas</h2>
          {canEdit && !creating && (
            <Button type="button" size="sm" variant="outline" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" />
              Criar categoria
            </Button>
          )}
        </div>

        {canEdit && creating && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome da nova categoria…"
              className="flex-1"
              autoFocus
              maxLength={80}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") cancelCreate();
              }}
            />
            <Button type="button" size="icon" variant="ghost" disabled={pending || !newLabel.trim()} aria-label="Confirmar" onClick={handleCreate}>
              <Check className="size-4 text-emerald-600" />
            </Button>
            <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="Cancelar" onClick={cancelCreate}>
              <X className="size-4" />
            </Button>
          </div>
        )}

        {segments.length === 0 && !creating ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "Nenhuma categoria personalizada. Use o botão acima para criar uma."
                : "Nenhuma categoria personalizada criada."}
            </p>
          </div>
        ) : segments.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {segments.map((seg) => (
              <div key={seg.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                {canEdit && editingId === seg.id ? (
                  <>
                    <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1" autoFocus maxLength={80} disabled={pending}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(seg.id); if (e.key === "Escape") cancelEdit(); }} />
                    <Button type="button" size="icon" variant="ghost" disabled={pending || !editLabel.trim()} aria-label="Guardar" onClick={() => handleSave(seg.id)}>
                      <Check className="size-4 text-emerald-600" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="Cancelar" onClick={cancelEdit}>
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-foreground">{seg.label}</span>
                    {canEdit && (
                      <>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Editar "${seg.label}"`} onClick={() => startEdit(seg)}>
                          <Pencil className="size-4 text-muted-foreground" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar "${seg.label}"`} className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(seg.id, seg.label)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Sistema ── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Sistema</h2>
        {canEdit && (
          <p className="text-xs text-muted-foreground">
            Pode renomear as categorias do sistema. O nome original fica guardado e pode ser restaurado a qualquer momento.
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {builtIns.map((seg) => (
            <div key={seg.key} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              {canEdit && editingBuiltInKey === seg.key ? (
                <>
                  <Input value={editBuiltInLabel} onChange={(e) => setEditBuiltInLabel(e.target.value)} className="flex-1" autoFocus maxLength={80} disabled={pending}
                    onKeyDown={(e) => { if (e.key === "Enter") handleBuiltInSave(seg.key); if (e.key === "Escape") cancelBuiltInEdit(); }} />
                  <Button type="button" size="icon" variant="ghost" disabled={pending || !editBuiltInLabel.trim()} aria-label="Guardar" onClick={() => handleBuiltInSave(seg.key)}>
                    <Check className="size-4 text-emerald-600" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="Cancelar" onClick={cancelBuiltInEdit}>
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{seg.currentLabel}</span>
                    {seg.isOverridden && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (original: {seg.defaultLabel})
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" aria-label={`Editar "${seg.currentLabel}"`} onClick={() => startBuiltInEdit(seg)}>
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                      {seg.isOverridden && (
                        <Button type="button" size="icon" variant="ghost" aria-label="Restaurar nome original" title="Restaurar nome original" onClick={() => handleBuiltInRestore(seg.key, seg.defaultLabel)}>
                          <RotateCcw className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
