"use client";

import { useActionState } from "react";

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

const initial: NutritionAssessmentFormResult | undefined = undefined;

export function NutritionAssessmentForm({ patientId }: { patientId: string }) {
  const [state, formAction] = useActionState(
    createNutritionAssessmentAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="patient_id" value={patientId} />

      <fieldset className="space-y-4">
        <legend className="text-foreground mb-1 text-sm font-semibold">
          Antropometria
        </legend>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-waist">Perímetro da cintura (cm)</Label>
            <Input
              id="na-waist"
              name="waist_cm"
              type="number"
              step="0.1"
              min={30}
              max={200}
              inputMode="decimal"
              placeholder="Opcional"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-foreground mb-1 text-sm font-semibold">
          Hábitos
        </legend>
        <div className="space-y-2">
          <Label htmlFor="na-activity">Nível de atividade física</Label>
          <select
            id="na-activity"
            name="activity_level"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            defaultValue=""
          >
            <option value="">—</option>
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
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            placeholder="Notas sobre padrão alimentar (opcional)"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-foreground mb-1 text-sm font-semibold">
          Clínica e objetivos
        </legend>
        <div className="space-y-2">
          <Label htmlFor="na-clinical">Notas clínicas relevantes</Label>
          <textarea
            id="na-clinical"
            name="clinical_notes"
            rows={3}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            placeholder="Condicionantes, medicação com impacto nutricional… (opcional)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="na-goals">Objetivos do plano</Label>
          <textarea
            id="na-goals"
            name="goals"
            rows={2}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[56px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            placeholder="Ex.: ganho de massa muscular, controlo glicémico… (opcional)"
          />
        </div>
      </fieldset>

      {state?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit">Registar avaliação</Button>
      <p className="text-muted-foreground text-xs">
        Cada envio cria um registo datado no histórico (não substitui avaliações
        anteriores). Os dados não são mostrados em notificações rápidas.
      </p>
    </form>
  );
}
