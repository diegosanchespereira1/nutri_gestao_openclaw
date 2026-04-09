"use client";

import { useActionState, useState } from "react";

import {
  type NutritionAssessmentFormResult,
  createNutritionAssessmentAction,
} from "@/lib/actions/nutrition-assessments";
import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: NutritionAssessmentFormResult | undefined = undefined;

// Dentro do Card (bg-card = branco), select e textarea usam bg-card para consistência
const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-foreground";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export function NutritionAssessmentForm({ patientId }: { patientId: string }) {
  const [state, formAction] = useActionState(
    createNutritionAssessmentAction,
    initial,
  );
  const [activityLevel, setActivityLevel] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="patient_id" value={patientId} />

      {/* ── Grupo 1: Antropometria ────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Antropometria</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="na-height">Altura (cm)</Label>
            <Input
              id="na-height"
              name="height_cm"
              type="number"
              step="0.1"
              min={40}
              max={250}
              inputMode="decimal"
              placeholder="Ex.: 165"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-weight">Peso (kg)</Label>
            <Input
              id="na-weight"
              name="weight_kg"
              type="number"
              step="0.1"
              min={2}
              max={400}
              inputMode="decimal"
              placeholder="Ex.: 70"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-waist">Cintura (cm)</Label>
            <Input
              id="na-waist"
              name="waist_cm"
              type="number"
              step="0.1"
              min={30}
              max={200}
              inputMode="decimal"
              placeholder="Opcional"
              className="tabular-nums"
            />
          </div>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 2: Hábitos ──────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Hábitos</legend>

        <div className="space-y-2">
          <Label htmlFor="na-activity">Nível de atividade física</Label>
          <select
            id="na-activity"
            name="activity_level"
            className={cn(selectClass, activityLevel === "" && "text-muted-foreground")}
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
          >
            <option value="">— selecionar —</option>
            {ACTIVITY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {activityLevelLabel[lvl]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="na-diet">Recordatório alimentar / hábitos</Label>
          <textarea
            id="na-diet"
            name="diet_notes"
            rows={3}
            className={textareaClass}
            style={{ minHeight: "72px" }}
            placeholder="Padrão alimentar, refeições típicas, preferências… (opcional)"
          />
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 3: Clínica e objetivos ──────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Clínica e objetivos</legend>

        <div className="space-y-2">
          <Label htmlFor="na-clinical">Notas clínicas relevantes</Label>
          <textarea
            id="na-clinical"
            name="clinical_notes"
            rows={3}
            className={textareaClass}
            style={{ minHeight: "72px" }}
            placeholder="Condicionantes, medicação com impacto nutricional… (opcional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="na-goals">Objetivos do plano</Label>
          <textarea
            id="na-goals"
            name="goals"
            rows={2}
            className={textareaClass}
            style={{ minHeight: "56px" }}
            placeholder="Ex.: ganho de massa muscular, controlo glicémico… (opcional)"
          />
        </div>
      </fieldset>

      {/* ── Feedback ──────────────────────────────────────── */}
      {state?.ok === false ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit">Registar avaliação</Button>
        <p className="text-xs text-muted-foreground">
          Cada envio cria um novo registo datado — o histórico anterior não é alterado.
        </p>
      </div>
    </form>
  );
}
