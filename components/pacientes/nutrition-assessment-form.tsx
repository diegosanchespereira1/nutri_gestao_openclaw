"use client";

import { useActionState, useState } from "react";

import {
  FormSection,
  FormSectionDivider,
  formFieldClass,
  formGridClass,
  nativeSelectValueClass,
} from "@/components/forms/form-section";
import { ReturnToHiddenField } from "@/components/navigation/return-to-hidden-field";
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
import { Textarea } from "@/components/ui/textarea";

const initial: NutritionAssessmentFormResult | undefined = undefined;

export function NutritionAssessmentForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState(
    createNutritionAssessmentAction,
    initial,
  );

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [dietNotes, setDietNotes] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [goals, setGoals] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <ReturnToHiddenField />
      <input type="hidden" name="patient_id" value={patientId} />

      <FormSection title="Antropometria">
        <div className={formGridClass}>
          <div className={formFieldClass}>
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
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>
          <div className={formFieldClass}>
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
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
          <div className={formFieldClass}>
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
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSectionDivider />

      <FormSection title="Hábitos">
        <div className={formFieldClass}>
          <Label htmlFor="na-activity">Nível de atividade física</Label>
          <select
            id="na-activity"
            name="activity_level"
            className={nativeSelectValueClass(activityLevel)}
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
          >
            <option value="">Selecione</option>
            {ACTIVITY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {activityLevelLabel[lvl]}
              </option>
            ))}
          </select>
        </div>

        <div className={formFieldClass}>
          <Label htmlFor="na-diet">Hábitos alimentares</Label>
          <Textarea
            id="na-diet"
            name="diet_notes"
            rows={3}
            placeholder="Rotina alimentar, refeições habituais, preferências… (opcional)"
            value={dietNotes}
            onChange={(e) => setDietNotes(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSectionDivider />

      <FormSection title="Clínica e objetivos">
        <div className={formFieldClass}>
          <Label htmlFor="na-clinical">Notas clínicas relevantes</Label>
          <Textarea
            id="na-clinical"
            name="clinical_notes"
            rows={3}
            placeholder="Condições clínicas, medicamentos com impacto nutricional… (opcional)"
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>

        <div className={formFieldClass}>
          <Label htmlFor="na-goals">Objetivos do plano</Label>
          <Textarea
            id="na-goals"
            name="goals"
            rows={2}
            placeholder="Ex.: ganho de massa muscular, controle glicêmico… (opcional)"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </div>
      </FormSection>

      {state?.ok === false ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Atualizando…" : "Atualizar informações complementares"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Cada envio cria um novo registro datado — o histórico anterior não é alterado.
        </p>
      </div>
    </form>
  );
}
