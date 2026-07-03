"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2, X, Check, Loader2, ChevronDown } from "lucide-react";

import {
  deleteNutritionAssessmentAction,
  updateNutritionAssessmentAction,
} from "@/lib/actions/nutrition-assessments";
import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import type { ActivityLevel } from "@/lib/constants/activity-levels";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import {
  buildAssessmentSummaryLine,
  formatAssessmentRecordedAt,
  toAssessmentNum,
} from "@/lib/utils/nutrition-assessment-display";
import { computeBmi } from "@/lib/utils/bmi";
import {
  formFieldClass,
  formGridClass,
  formSectionLegendClass,
  nativeSelectValueClass,
} from "@/components/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function DataItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={highlight ? "font-mono font-semibold tabular-nums text-foreground" : "tabular-nums text-foreground"}>{value}</dd>
    </div>
  );
}

function TextField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className={formSectionLegendClass}>{label}</p>
      {value ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">–</p>
      )}
    </div>
  );
}

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
    <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-4 border-t border-border bg-card px-4 py-4">
      <input type="hidden" name="assessment_id" value={row.id} />

      <div className={formGridClass}>
        <div className={formFieldClass}>
          <Label htmlFor={`edit-h-${row.id}`}>Altura (cm)</Label>
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
        <div className={formFieldClass}>
          <Label htmlFor={`edit-w-${row.id}`}>Peso (kg)</Label>
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
        <div className={formFieldClass}>
          <Label htmlFor={`edit-wt-${row.id}`}>Cintura (cm)</Label>
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

      <div className={formFieldClass}>
        <Label htmlFor={`edit-act-${row.id}`}>Nível de atividade</Label>
        <select
          id={`edit-act-${row.id}`}
          name="activity_level"
          className={nativeSelectValueClass(activityLevel)}
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
        >
          <option value="">Selecione</option>
          {ACTIVITY_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{activityLevelLabel[lvl]}</option>
          ))}
        </select>
      </div>

      <div className={formFieldClass}>
        <Label htmlFor={`edit-diet-${row.id}`}>Hábitos alimentares</Label>
        <Textarea
          id={`edit-diet-${row.id}`}
          name="diet_notes"
          rows={2}
          defaultValue={row.diet_notes ?? ""}
          placeholder="Opcional"
        />
      </div>
      <div className={formFieldClass}>
        <Label htmlFor={`edit-clin-${row.id}`}>Notas clínicas</Label>
        <Textarea
          id={`edit-clin-${row.id}`}
          name="clinical_notes"
          rows={2}
          defaultValue={row.clinical_notes ?? ""}
          placeholder="Opcional"
        />
      </div>
      <div className={formFieldClass}>
        <Label htmlFor={`edit-goals-${row.id}`}>Objetivos</Label>
        <Textarea
          id={`edit-goals-${row.id}`}
          name="goals"
          rows={2}
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
          Salvar
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
    <form action={formAction} onReset={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-2 border-t border-border bg-destructive/5 px-4 py-3">
      <input type="hidden" name="assessment_id" value={row.id} />
      <p className="flex-1 text-sm text-destructive">
        Excluir este registro permanentemente?
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
  const [isOpen, setIsOpen] = useState(false);
  const summary = buildAssessmentSummaryLine(row);

  const h = toAssessmentNum(row.height_cm);
  const w = toAssessmentNum(row.weight_kg);
  const waist = toAssessmentNum(row.waist_cm);
  const bmi = h && w ? computeBmi(h, w) : null;
  const activity =
    row.activity_level && ACTIVITY_LEVELS.includes(row.activity_level as ActivityLevel)
      ? activityLevelLabel[row.activity_level as ActivityLevel]
      : null;

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {/* Cabeçalho — sempre visível */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => { if (mode === "view") setIsOpen((v) => !v); }}
          aria-expanded={isOpen}
          aria-label={`Avaliação de ${formatAssessmentRecordedAt(row.recorded_at)}`}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm font-medium text-foreground">
              {formatAssessmentRecordedAt(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </div>
        </button>

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Editar avaliação"
            onClick={() => { setMode(mode === "edit" ? "view" : "edit"); setIsOpen(false); }}
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
            aria-label="Excluir avaliação"
            onClick={() => { setMode(mode === "confirm-delete" ? "view" : "confirm-delete"); setIsOpen(false); }}
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
      {mode === "view" && isOpen && (
        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
          {/* Antropometria */}
          <div>
            <p className={formSectionLegendClass}>Antropometria & atividade</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <DataItem label="Altura" value={h != null ? `${h} cm` : "–"} />
              <DataItem label="Peso" value={w != null ? `${w} kg` : "–"} />
              <DataItem label="IMC" value={bmi != null ? `${bmi} kg/m²` : "–"} highlight />
              <DataItem label="Cintura" value={waist != null ? `${waist} cm` : "–"} />
              <DataItem label="Atividade" value={activity ?? "–"} />
            </dl>
          </div>

          {/* Texto */}
          <TextField label="Hábitos alimentares" value={row.diet_notes} />
          <TextField label="Notas clínicas" value={row.clinical_notes} />
          <TextField label="Objetivos" value={row.goals} />
        </div>
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
