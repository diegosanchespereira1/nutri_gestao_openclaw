"use client";

import { useActionState, useMemo, useState } from "react";

import {
  formFieldClass,
  nativeSelectValueClass,
} from "@/components/forms/form-section";
import {
  AnthroPercentileHint,
  AnthropometricReferenceSelect,
  AssessmentCalcChip,
  AssessmentFormSection,
  PatientGroupSelect,
} from "@/components/pacientes/assessment-form-section";
import {
  adultAnthroNoteForGroup,
  tableModeFromReference,
} from "@/lib/nutrition/adult/anthropometric-percentiles";
import { ReturnToHiddenField } from "@/components/navigation/return-to-hidden-field";
import {
  type AdultNutritionAssessmentFormResult,
  createAdultNutritionAssessmentAction,
} from "@/lib/actions/adult-nutrition-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  type PatientGroup,
  type NutritionalRisk,
  type AnthropometricReference,
} from "@/lib/types/adult-nutrition-assessments";
import {
  ADULT_ESTIMATED_WEIGHT_FORMULA_DESC,
  adultEstimatedHeightFormulaLabel,
  calcAdultEstimatedHeightM,
  calcAdultEstimatedWeightKg,
} from "@/lib/nutrition/adult-anthropometry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initial: AdultNutritionAssessmentFormResult | undefined = undefined;

function toNum(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

type NumericField = string;

export function AdultNutritionAssessmentForm({
  patientId,
  defaultAge,
  defaultAnthropometricReference = "",
}: {
  patientId: string;
  defaultAge?: number;
  defaultAnthropometricReference?: AnthropometricReference | "";
}) {
  const [state, formAction, pending] = useActionState(
    createAdultNutritionAssessmentAction,
    initial,
  );

  const [group, setGroup] = useState<PatientGroup | "">("");
  const [hasAmputation, setHasAmputation] = useState(false);
  const [ampPct, setAmpPct] = useState<NumericField>("5.9");

  const [age, setAge] = useState<NumericField>(
    defaultAge != null ? String(defaultAge) : "",
  );
  const [anthroRef, setAnthroRef] = useState<AnthropometricReference | "">(
    defaultAnthropometricReference,
  );
  const [cb, setCb] = useState<NumericField>("");
  const [dct, setDct] = useState<NumericField>("");
  const [cp, setCp] = useState<NumericField>("");
  const [aj, setAj] = useState<NumericField>("");
  const [weightReal, setWeightReal] = useState<NumericField>("");
  const [kcal, setKcal] = useState<NumericField>("");
  const [ptn, setPtn] = useState<NumericField>("");

  const [risk, setRisk] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const numAge = toNum(age);
  const numCb = toNum(cb);
  const numDct = toNum(dct);
  const numAj = toNum(aj);
  const numKcal = toNum(kcal);
  const numPtn = toNum(ptn);
  const numAmp = toNum(ampPct);

  const cmb = useMemo<number | null>(() => {
    if (numCb === null || numDct === null) return null;
    return numCb - numDct * 0.314;
  }, [numCb, numDct]);

  const peBase = useMemo<number | null>(() => {
    if (numAj === null || numCb === null) return null;
    const v = calcAdultEstimatedWeightKg(numAj, numCb);
    return Number.isFinite(v) ? v : null;
  }, [numAj, numCb]);

  const ampPctNum = hasAmputation && numAmp !== null ? numAmp : 0;

  const pe = useMemo<number | null>(() => {
    if (peBase === null) return null;
    if (!hasAmputation || ampPctNum <= 0) return peBase;
    return (peBase * 100) / (100 - ampPctNum);
  }, [peBase, hasAmputation, ampPctNum]);

  const altura = useMemo<number | null>(() => {
    if (!group || numAj === null) return null;
    const needsAge = group === "mulher_branca" || group === "mulher_negra";
    if (needsAge && numAge === null) return null;
    return calcAdultEstimatedHeightM(group, numAj, needsAge ? numAge : null);
  }, [group, numAj, numAge]);

  const tableMode = anthroRef ? tableModeFromReference(anthroRef) : null;

  const cbNote = useMemo(
    () =>
      tableMode && group
        ? adultAnthroNoteForGroup("cb", tableMode, group, numAge, numCb, "compact")
        : null,
    [tableMode, group, numAge, numCb],
  );
  const dctNote = useMemo(
    () =>
      tableMode && group
        ? adultAnthroNoteForGroup("dct", tableMode, group, numAge, numDct, "compact")
        : null,
    [tableMode, group, numAge, numDct],
  );
  const cmbNote = useMemo(
    () =>
      tableMode && group
        ? adultAnthroNoteForGroup("cmb", tableMode, group, numAge, cmb, "compact")
        : null,
    [tableMode, group, numAge, cmb],
  );

  const imc = useMemo<number | null>(() => {
    if (pe === null || altura === null || altura <= 0) return null;
    const rawImc = pe / (altura * altura);
    if (!hasAmputation || ampPctNum <= 0) return rawImc;
    return rawImc * (1 - ampPctNum / 100);
  }, [pe, altura, hasAmputation, ampPctNum]);

  const ne = useMemo<number | null>(() => {
    if (pe === null || numKcal === null) return null;
    return pe * numKcal;
  }, [pe, numKcal]);

  const np = useMemo<number | null>(() => {
    if (pe === null || numPtn === null) return null;
    return pe * numPtn;
  }, [pe, numPtn]);

  const peBaseStr = ADULT_ESTIMATED_WEIGHT_FORMULA_DESC.replace("PE (kg) = ", "");
  const peFormula =
    hasAmputation && ampPctNum > 0
      ? `(${peBaseStr}) × 100 ÷ (100 − ${ampPctNum}%)`
      : peBaseStr;

  const altFormula = group
    ? adultEstimatedHeightFormulaLabel(group)
    : "Selecione o grupo (sexo / etnia)";

  const imcFormula =
    hasAmputation && ampPctNum > 0
      ? `PE ÷ Altura² × (1 − ${ampPctNum}%)`
      : "PE ÷ Altura²";

  return (
    <form
      action={formAction}
      onReset={(e) => e.preventDefault()}
      className="space-y-6"
    >
      <ReturnToHiddenField />
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="has_amputation" value={String(hasAmputation)} />
      <input
        type="hidden"
        name="cmb_cm"
        value={cmb !== null ? String(cmb) : ""}
      />
      <input
        type="hidden"
        name="estimated_weight_kg"
        value={pe !== null ? String(pe) : ""}
      />
      <input
        type="hidden"
        name="estimated_height_m"
        value={altura !== null ? String(altura) : ""}
      />
      <input
        type="hidden"
        name="bmi"
        value={imc !== null ? String(imc) : ""}
      />
      <input
        type="hidden"
        name="energy_needs_kcal"
        value={ne !== null ? String(ne) : ""}
      />
      <input
        type="hidden"
        name="protein_needs_g"
        value={np !== null ? String(np) : ""}
      />

      <div className="space-y-4 sm:space-y-5">
        {/* Coleta (esq.) · Resultados (dir.) — pilhas independentes, sem buracos */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <AssessmentFormSection
              title="Perfil do paciente"
              description="Dados usados nas equações de estimativa"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <PatientGroupSelect
                  id="adult-group"
                  value={group}
                  onChange={setGroup}
                  className={nativeSelectValueClass(group)}
                />

                <div className={formFieldClass}>
                  <Label htmlFor="adult-age">Idade (anos)</Label>
                  <Input
                    id="adult-age"
                    name="age_years"
                    type="number"
                    min={0}
                    max={130}
                    step={1}
                    inputMode="numeric"
                    placeholder="Ex.: 42"
                    className="tabular-nums"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
              <AnthropometricReferenceSelect
                id="adult-anthro-ref"
                value={anthroRef}
                onChange={setAnthroRef}
                className={nativeSelectValueClass(anthroRef)}
                required={numCb != null || numDct != null}
              />
              <p className="text-xs text-muted-foreground">
                Altura estimada: Chumlea (idade obrigatória para mulheres). Peso
                estimado: AJ + CB.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={hasAmputation}
                    onChange={(e) => setHasAmputation(e.target.checked)}
                  />
                  Membro amputado
                </label>

                {hasAmputation ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Label
                      htmlFor="adult-amp-pct"
                      className="whitespace-nowrap text-sm"
                    >
                      % do segmento amputado
                    </Label>
                    <Input
                      id="adult-amp-pct"
                      name="amputation_segment_pct"
                      type="number"
                      min={0.1}
                      max={99.9}
                      step={0.1}
                      className="w-24 tabular-nums"
                      value={ampPct}
                      onChange={(e) => setAmpPct(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">
                      coxa = 10,0% · perna + pé = 5,9% · pé = 1,8%
                    </span>
                  </div>
                ) : null}
              </div>
            </AssessmentFormSection>

            <AssessmentFormSection
              title="Medidas antropométricas"
              description="Preencha as medidas coletadas nesta avaliação"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={formFieldClass}>
                  <Label htmlFor="adult-cb">CB — circ. do braço (cm)</Label>
                  <Input
                    id="adult-cb"
                    name="cb_cm"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 23"
                    className="tabular-nums"
                    value={cb}
                    onChange={(e) => setCb(e.target.value)}
                  />
                  <AnthroPercentileHint text={cbNote} />
                </div>
                <div className={formFieldClass}>
                  <Label htmlFor="adult-dct">DCT — dobra tricipital (mm)</Label>
                  <Input
                    id="adult-dct"
                    name="dct_mm"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 8"
                    className="tabular-nums"
                    value={dct}
                    onChange={(e) => setDct(e.target.value)}
                  />
                  <AnthroPercentileHint text={dctNote} />
                </div>
                <div className={formFieldClass}>
                  <Label htmlFor="adult-cp">CP — circ. panturrilha (cm)</Label>
                  <Input
                    id="adult-cp"
                    name="cp_cm"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 27"
                    className="tabular-nums"
                    value={cp}
                    onChange={(e) => setCp(e.target.value)}
                  />
                </div>
                <div className={formFieldClass}>
                  <Label htmlFor="adult-aj">AJ — altura do joelho (cm)</Label>
                  <Input
                    id="adult-aj"
                    name="aj_cm"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 48,5"
                    className="tabular-nums"
                    value={aj}
                    onChange={(e) => setAj(e.target.value)}
                  />
                </div>
                <div className={cn(formFieldClass, "sm:col-span-2")}>
                  <Label htmlFor="adult-weight">Peso real (kg)</Label>
                  <Input
                    id="adult-weight"
                    name="weight_real_kg"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Opcional"
                    className="max-w-xs tabular-nums"
                    value={weightReal}
                    onChange={(e) => setWeightReal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio se o peso não for mensurável.
                  </p>
                </div>
              </div>
            </AssessmentFormSection>
          </div>

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <AssessmentFormSection
              title="Valores calculados"
              description="Atualizam automaticamente — não precisam ser preenchidos"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AssessmentCalcChip
                  code="CMB"
                  label="Circ. muscular do braço"
                  value={fmt(cmb)}
                  unit="cm"
                  formula="CB − (DCT × 0,314)"
                  hint={cmbNote}
                  highlight
                />
                <AssessmentCalcChip
                  code="PE"
                  label="Peso estimado"
                  value={fmt(pe)}
                  unit="kg"
                  formula={peFormula}
                  highlight
                />
                <AssessmentCalcChip
                  code="AE"
                  label="Altura estimada"
                  value={fmt(altura, 3)}
                  unit="m"
                  formula={altFormula}
                  highlight
                />
                <AssessmentCalcChip
                  code="IMC"
                  label="IMC"
                  value={fmt(imc)}
                  unit="kg/m²"
                  formula={imcFormula}
                  highlight
                />
              </div>
            </AssessmentFormSection>

            <AssessmentFormSection
              title="Prescrição energético-proteica"
              description="Metas por kg · necessidades calculadas abaixo"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={formFieldClass}>
                  <Label htmlFor="adult-kcal">Kcal/kg · dia</Label>
                  <Input
                    id="adult-kcal"
                    name="kcal_per_kg"
                    type="number"
                    step="0.5"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 30"
                    className="tabular-nums"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                  />
                </div>
                <div className={formFieldClass}>
                  <Label htmlFor="adult-ptn">g PTN/kg · dia</Label>
                  <Input
                    id="adult-ptn"
                    name="ptn_per_kg"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Ex.: 1,2"
                    className="tabular-nums"
                    value={ptn}
                    onChange={(e) => setPtn(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <AssessmentCalcChip
                  code="NE"
                  label="Necessidade energética"
                  value={
                    ne !== null ? Math.round(ne).toLocaleString("pt-BR") : "–"
                  }
                  unit="kcal/dia"
                  formula="NE = Peso Estimado × Kcal/kg"
                  highlight
                />
                <AssessmentCalcChip
                  code="NP"
                  label="Necessidade proteica"
                  value={fmt(np, 1)}
                  unit="g/dia"
                  formula="NP = g PTN/kg × Peso Estimado"
                  highlight
                />
              </div>
            </AssessmentFormSection>
          </div>
        </div>

        <AssessmentFormSection
          title="Avaliação clínica"
          description="Classificação e observações desta consulta"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className={formFieldClass}>
              <Label htmlFor="adult-risk">Risco nutricional</Label>
              <select
                id="adult-risk"
                name="nutritional_risk"
                className={nativeSelectValueClass(risk)}
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
              >
                <option value="">Não avaliado</option>
                {(
                  Object.entries(NUTRITIONAL_RISK_LABELS) as [
                    NutritionalRisk,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={formFieldClass}>
              <Label htmlFor="adult-diagnosis">Diagnóstico nutricional</Label>
              <Input
                id="adult-diagnosis"
                name="nutritional_diagnosis"
                placeholder="Ex.: SRD-19, SRN-12, D-16 (opcional)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
            <div className={cn(formFieldClass, "sm:col-span-2 lg:col-span-1")}>
              <Label htmlFor="adult-notes">Notas clínicas</Label>
              <Textarea
                id="adult-notes"
                name="clinical_notes"
                rows={3}
                placeholder="Condições clínicas, medicamentos com impacto nutricional, objetivos… (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </AssessmentFormSection>
      </div>

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
          {pending ? "Registrando…" : "Registrar avaliação (adultos)"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Cada envio cria um novo registro com data e hora — o histórico anterior
          não é alterado.
        </p>
      </div>
    </form>
  );
}
