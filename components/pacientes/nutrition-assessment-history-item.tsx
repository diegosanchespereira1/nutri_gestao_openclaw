"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2, X, Check, Loader2 } from "lucide-react";

import {
  deleteNutritionAssessmentAction,
  updateNutritionAssessmentAction,
} from "@/lib/actions/nutrition-assessments";
import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import {
  buildAssessmentSummaryLine,
  formatAssessmentRecordedAt,
} from "@/lib/utils/nutrition-assessment-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-foreground";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type Mode = "view" | "edit" | "confirm-delete";

// ── Formulário de edição inline ───────────────────────────────────────────────
function EditForm({
  row,
  onCancel,
}: {
  row: NutritionAssessmentRow;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateNutritionAssessmentAction,
    undefined,
  );

  const [activityLevel, setActivityLevel] = useState(row.activity_level ?? "");

  return (
    <form action={formAction} className="space-y-4 border-t border-border bg-card px-4 py-4">
      <input type="hidden" name="assessment_id" value={row.id} />

      {/* Antropometria */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`edit-h-${row.id}`} className="text-xs">Altura (cm)</Label>
          <Input
            id={`edit-h-${row.id}`}
            name="height_cm"
            type="number"
            step="0.1"
            defaultValue={row.height_cm ?? ""}
            placeholder="—"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-w-${row.id}`} className="text-xs">Peso (kg)</Label>
          <Input
            id={`edit-w-${row.id}`}
            name="weight_kg"
            type="number"
            step="0.1"
            defaultValue={row.weight_kg ?? ""}
            placeholder="—"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-wt-${row.id}`} className="text-xs">Cintura (cm)</Label>
          <Input
            id={`edit-wt-${row.id}`}
            name="waist_cm"
            type="number"
            step="0.1"
            defaultValue={row.waist_cm ?? ""}
            placeholder="—"
            className="tabular-nums"
          />
        </div>
      </div>

      {/* Atividade */}
      <div className="space-y-1.5">
        <Label htmlFor={`edit-act-${row.id}`} className="text-xs">Nível de atividade</Label>
        <select
          id={`edit-act-${row.id}`}
          name="activity_level"
          className={cn(selectClass, "max-w-xs", activityLevel === "" && "text-muted-foreground")}
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
        >
          <option value="">— selecionar —</option>
          {ACTIVITY_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{activityLevelLabel[lvl]}</option>
          ))}
        </select>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor={`edit-diet-${row.id}`} className="text-xs">Alimentação / hábitos</Label>
        <textarea
          id={`edit-diet-${row.id}`}
          name="diet_notes"
          rows={2}
          className={textareaClass}
          defaultValue={row.diet_notes ?? ""}
          placeholder="Opcional"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-clin-${row.id}`} className="text-xs">Notas clínicas</Label>
        <textarea
          id={`edit-clin-${row.id}`}
          name="clinical_notes"
          rows={2}
          className={textareaClass}
          defaultValue={row.clinical_notes ?? ""}
          placeholder="Opcional"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`edit-goals-${row.id}`} className="text-xs">Objetivos</Label>
        <textarea
          id={`edit-goals-${row.id}`}
          name="goals"
          rows={2}
          className={textareaClass}
          defaultValue={row.goals ?? ""}
          placeholder="Opcional"
        />
      </div>

      {state?.ok === false && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
          Guardar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Confirmação de exclusão ───────────────────────────────────────────────────
function DeleteConfirm({
  row,
  onCancel,
}: {
  row: NutritionAssessmentRow;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteNutritionAssessmentAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 border-t border-border bg-destructive/5 px-4 py-3">
      <input type="hidden" name="assessment_id" value={row.id} />
      <p className="flex-1 text-sm text-destructive">
        Eliminar este registo permanentemente?
      </p>
      {state?.ok === false && (
        <span className="w-full text-xs text-destructive">{state.error}</span>
      )}
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
        Confirmar exclusão
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
    </form>
  );
}

// ── Card principal ────────────────────────────────────────────────────────────
export function NutritionAssessmentHistoryItem({
  row,
}: {
  row: NutritionAssessmentRow;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const summary = buildAssessmentSummaryLine(row);

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {/* Cabeçalho — sempre visível */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between"
          onClick={() => mode === "view" && setMode("view")}
          aria-label={`Avaliação de ${formatAssessmentRecordedAt(row.recorded_at)}`}
        >
          <span className="text-sm font-medium text-foreground">
            {formatAssessmentRecordedAt(row.recorded_at)}
          </span>
          <span className="text-xs text-muted-foreground">{summary}</span>
        </button>

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Editar avaliação"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              mode === "edit"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Eliminar avaliação"
            onClick={() => setMode(mode === "confirm-delete" ? "view" : "confirm-delete")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              mode === "confirm-delete"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* View: detalhe colapsável */}
      {mode === "view" && (
        <details>
          <summary className="cursor-pointer list-none border-t border-border/40 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 marker:content-none [&::-webkit-details-marker]:hidden">
            Ver detalhes ▾
          </summary>
          <div className="space-y-3 border-t border-border bg-card px-4 py-4 text-sm">
            {row.diet_notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alimentação / hábitos</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{row.diet_notes}</p>
              </div>
            ) : null}
            {row.clinical_notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notas clínicas</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{row.clinical_notes}</p>
              </div>
            ) : null}
            {row.goals ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Objetivos</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{row.goals}</p>
              </div>
            ) : null}
            {!row.diet_notes && !row.clinical_notes && !row.goals ? (
              <p className="text-muted-foreground">Apenas dados antropométricos / atividade neste registo.</p>
            ) : null}
          </div>
        </details>
      )}

      {/* Edit: formulário inline */}
      {mode === "edit" && (
        <EditForm row={row} onCancel={() => setMode("view")} />
      )}

      {/* Confirm delete */}
      {mode === "confirm-delete" && (
        <DeleteConfirm row={row} onCancel={() => setMode("view")} />
      )}
    </li>
  );
}
