"use client";

import { useActionState, useMemo, useState } from "react";

import { ReturnToHiddenField } from "@/components/navigation/return-to-hidden-field";
import {
  type ChildAssessmentFormResult,
  createChildAssessmentAction,
} from "@/lib/actions/child-assessments";
import { ageInMonths } from "@/lib/nutrition/child/age";
import { assessChild } from "@/lib/nutrition/child/assess";
import { isMethodAvailable } from "@/lib/nutrition/child/reference";
import { CHILD_METHOD_LABELS } from "@/lib/nutrition/child/labels";
import type {
  ChildSex,
  ClassificationMethod,
} from "@/lib/nutrition/child/types";
import { ChildAssessmentResultCards } from "@/components/pacientes/child-assessment-result-cards";
import { ChildGrowthCurve } from "@/components/pacientes/child-growth-curve";
import {
  MeasurementTips,
  HEIGHT_MEASUREMENT_TIPS,
  WEIGHT_MEASUREMENT_TIPS,
} from "@/components/pacientes/measurement-tips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: ChildAssessmentFormResult | undefined = undefined;

const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-foreground";
const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";
const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

function toNum(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function ageLabel(months: number | null): string {
  if (months == null) return "–";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y}a ${m}m (${months} meses)`;
}

export function ChildAssessmentForm({
  patientId,
  defaultSex,
  defaultBirthDate,
}: {
  patientId: string;
  defaultSex?: ChildSex | null;
  defaultBirthDate?: string | null;
}) {
  const [state, formAction] = useActionState(createChildAssessmentAction, initial);

  const zAvailable = isMethodAvailable("zscore");

  const [sex, setSex] = useState<ChildSex | "">(
    defaultSex === "female" || defaultSex === "male" ? defaultSex : "",
  );
  const [birthDate, setBirthDate] = useState<string>(
    defaultBirthDate ? defaultBirthDate.slice(0, 10) : "",
  );
  const [recordedAt, setRecordedAt] = useState<string>(todayISO());
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [method, setMethod] = useState<ClassificationMethod>("percentile");
  const [notes, setNotes] = useState<string>("");
  // Novos parâmetros WHO (3–60 meses para CB/PCT/SE; 0–60 meses para PC)
  const [armCircumference, setArmCircumference] = useState<string>("");
  const [tricepsSkinfold, setTricepsSkinfold] = useState<string>("");
  const [subscapularSkinfold, setSubscapularSkinfold] = useState<string>("");
  const [headCircumference, setHeadCircumference] = useState<string>("");

  const ageMonths = useMemo<number | null>(() => {
    if (!birthDate || !recordedAt) return null;
    return ageInMonths(new Date(birthDate), new Date(recordedAt));
  }, [birthDate, recordedAt]);

  const measuredLying = ageMonths != null && ageMonths < 24;

  const numWeight = toNum(weight);
  const numHeight = toNum(height);
  const numArmCircumference    = toNum(armCircumference);
  const numTricepsSkinfold     = toNum(tricepsSkinfold);
  const numSubscapularSkinfold = toNum(subscapularSkinfold);
  const numHeadCircumference   = toNum(headCircumference);

  // Faixas de exibição dos novos campos conforme tabelas WHO disponíveis
  const showSkinfoldAndCB = ageMonths != null && ageMonths >= 3 && ageMonths <= 60;
  const showHeadCirc      = ageMonths != null && ageMonths >= 0 && ageMonths <= 60;

  const assessment = useMemo(() => {
    if (sex === "" || ageMonths == null) return null;
    return assessChild({
      sex,
      ageMonths,
      weightKg: numWeight,
      heightCm: numHeight,
      method,
      armCircumferenceCm:    numArmCircumference,
      tricepsSkinfoldMm:     numTricepsSkinfold,
      subscapularSkinfoldMm: numSubscapularSkinfold,
      headCircumferenceCm:   numHeadCircumference,
    });
  }, [sex, ageMonths, numWeight, numHeight, method, numArmCircumference, numTricepsSkinfold, numSubscapularSkinfold, numHeadCircumference]);

  const canSubmit =
    sex !== "" && ageMonths != null && (numWeight != null || numHeight != null);

  return (
    <form action={formAction} className="space-y-6">
      <ReturnToHiddenField />
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="sex" value={sex} />
      <input type="hidden" name="birth_date" value={birthDate} />
      <input type="hidden" name="recorded_at" value={recordedAt} />
      <input type="hidden" name="age_months" value={ageMonths != null ? String(ageMonths) : ""} />
      <input type="hidden" name="weight_kg" value={numWeight != null ? String(numWeight) : ""} />
      <input type="hidden" name="height_cm" value={numHeight != null ? String(numHeight) : ""} />
      <input type="hidden" name="measured_lying" value={String(measuredLying)} />
      <input type="hidden" name="classification_method" value={method} />
      <input type="hidden" name="arm_circumference_cm"    value={numArmCircumference    != null ? String(numArmCircumference)    : ""} />
      <input type="hidden" name="triceps_skinfold_mm"     value={numTricepsSkinfold     != null ? String(numTricepsSkinfold)     : ""} />
      <input type="hidden" name="subscapular_skinfold_mm" value={numSubscapularSkinfold != null ? String(numSubscapularSkinfold) : ""} />
      <input type="hidden" name="head_circumference_cm"   value={numHeadCircumference   != null ? String(numHeadCircumference)   : ""} />

      {/* Perfil + datas */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ca-sex">Sexo</Label>
            <select
              id="ca-sex"
              className={cn(selectClass, sex === "" && "text-muted-foreground")}
              value={sex}
              onChange={(e) => setSex(e.target.value as ChildSex | "")}
            >
              <option value="">— selecione —</option>
              <option value="female">Feminino</option>
              <option value="male">Masculino</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca-birth">Data de nascimento</Label>
            <Input
              id="ca-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca-recorded">Data da avaliação</Label>
            <Input
              id="ca-recorded"
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Idade na avaliação</Label>
            <p className="flex h-9 items-center font-mono text-sm tabular-nums text-foreground">
              {ageLabel(ageMonths)}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* Medidas */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Medidas</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ca-weight">Peso (kg)</Label>
              <MeasurementTips title="Como medir o peso" tips={WEIGHT_MEASUREMENT_TIPS} />
            </div>
            <Input
              id="ca-weight"
              type="number"
              step="0.01"
              min={0}
              inputMode="decimal"
              placeholder="Ex.: 22,0"
              className="tabular-nums"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="relative space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ca-height">
                {measuredLying ? "Comprimento (cm) — deitado" : "Estatura (cm) — em pé"}
              </Label>
              <MeasurementTips
                title="Como medir a estatura"
                tips={HEIGHT_MEASUREMENT_TIPS}
              />
            </div>
            <Input
              id="ca-height"
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              placeholder="Ex.: 120"
              className="tabular-nums"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ca-method">Critério de classificação</Label>
          <select
            id="ca-method"
            className={selectClass}
            value={method}
            onChange={(e) => setMethod(e.target.value as ClassificationMethod)}
          >
            <option value="percentile">{CHILD_METHOD_LABELS.percentile}</option>
            <option value="zscore" disabled={!zAvailable}>
              {CHILD_METHOD_LABELS.zscore}
              {zAvailable ? "" : " — referência ainda não carregada"}
            </option>
          </select>
        </div>

        {/* Campos WHO 0–60 meses: Perímetro cefálico */}
        {showHeadCirc && (
          <div className="space-y-2">
            <Label htmlFor="ca-head-circ">Perímetro cefálico (cm)</Label>
            <Input
              id="ca-head-circ"
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              placeholder="Ex.: 39,5"
              className="tabular-nums"
              value={headCircumference}
              onChange={(e) => setHeadCircumference(e.target.value)}
            />
          </div>
        )}

        {/* Campos WHO 3–60 meses: CB, PCT, SE */}
        {showSkinfoldAndCB && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ca-arm-circ">Circunferência do braço (cm)</Label>
              <Input
                id="ca-arm-circ"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                placeholder="Ex.: 14,5"
                className="tabular-nums"
                value={armCircumference}
                onChange={(e) => setArmCircumference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-triceps">Prega tricipital (mm)</Label>
              <Input
                id="ca-triceps"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                placeholder="Ex.: 8,5"
                className="tabular-nums"
                value={tricepsSkinfold}
                onChange={(e) => setTricepsSkinfold(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-subscapular">Prega subescapular (mm)</Label>
              <Input
                id="ca-subscapular"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                placeholder="Ex.: 6,1"
                className="tabular-nums"
                value={subscapularSkinfold}
                onChange={(e) => setSubscapularSkinfold(e.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Resultado em tempo real */}
      {assessment && (
        <fieldset className="space-y-4">
          <legend className={legendClass}>Resultado</legend>
          {assessment.bmi != null && (
            <p className="text-sm text-muted-foreground">
              IMC calculado:{" "}
              <span className="font-mono font-semibold text-foreground">
                {assessment.bmi.toFixed(1).replace(".", ",")} kg/m²
              </span>
            </p>
          )}
          <ChildAssessmentResultCards indicators={assessment.indicators} />

          <div className="grid gap-4 lg:grid-cols-3">
            {numWeight != null && (
              <ChildGrowthCurve
                indicator="weight_for_age"
                sex={sex as ChildSex}
                ageMonths={ageMonths as number}
                value={numWeight}
                method={method}
              />
            )}
            {numHeight != null && (
              <ChildGrowthCurve
                indicator="height_for_age"
                sex={sex as ChildSex}
                ageMonths={ageMonths as number}
                value={numHeight}
                method={method}
              />
            )}
            {assessment.bmi != null && (
              <ChildGrowthCurve
                indicator="bmi_for_age"
                sex={sex as ChildSex}
                ageMonths={ageMonths as number}
                value={assessment.bmi}
                method={method}
              />
            )}
          </div>
        </fieldset>
      )}

      <div className="border-t border-border" />

      <fieldset className="space-y-2">
        <legend className={legendClass}>Notas clínicas</legend>
        <textarea
          name="clinical_notes"
          rows={3}
          className={textareaClass}
          style={{ minHeight: "72px" }}
          placeholder="Observações, queixas, objetivos… (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </fieldset>

      {state?.ok === false ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={!canSubmit}>
          Registar avaliação
        </Button>
        <p className="text-xs text-muted-foreground">
          Cada envio cria um novo registo com data — o histórico anterior não é
          alterado.
        </p>
      </div>
    </form>
  );
}
