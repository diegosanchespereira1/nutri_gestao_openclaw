"use client";

import { useActionState, useMemo, useState } from "react";

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
  type GeriatricAssessmentFormResult,
  createGeriatricAssessmentAction,
} from "@/lib/actions/geriatric-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  type PatientGroup,
  type NutritionalRisk,
  type AnthropometricReference,
} from "@/lib/types/geriatric-assessments";
import {
  calcGeriatricEstimatedWeightKg,
  calcGeriatricEstimatedHeightM,
  GERIATRIC_PE_FORMULAS,
} from "@/lib/nutrition/geriatric-anthropometry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: GeriatricAssessmentFormResult | undefined = undefined;

const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-foreground";

// Selects com opção vazia: texto claro (muted) quando nada selecionado, escuro quando preenchido
function selectValueClass(value: string) {
  return cn(selectClass, value === "" && "text-muted-foreground");
}

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

// Funções de cálculo importadas de lib/nutrition/geriatric-anthropometry.ts

function toNum(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

type NumericField = string;

export function GeriatricAssessmentForm({
  patientId,
  defaultAge,
  defaultAnthropometricReference = "",
}: {
  patientId: string;
  defaultAge?: number;
  defaultAnthropometricReference?: AnthropometricReference | "";
}) {
  const [state, formAction] = useActionState(createGeriatricAssessmentAction, initial);

  // ── Estado dos inputs (todos controlados para preservar valores em re-render) ─
  const [group, setGroup]               = useState<PatientGroup | "">("");
  const [hasAmputation, setHasAmputation] = useState(false);
  const [ampPct, setAmpPct]             = useState<NumericField>("5.9");

  const [age, setAge]               = useState<NumericField>(defaultAge != null ? String(defaultAge) : "");
  const [anthroRef, setAnthroRef]   = useState<AnthropometricReference | "">(
    defaultAnthropometricReference,
  );
  const [cb, setCb]                 = useState<NumericField>("");
  const [dct, setDct]               = useState<NumericField>("");
  const [cp, setCp]                 = useState<NumericField>("");
  const [aj, setAj]                 = useState<NumericField>("");
  const [weightReal, setWeightReal] = useState<NumericField>("");
  const [kcal, setKcal]             = useState<NumericField>("");
  const [ptn, setPtn]               = useState<NumericField>("");

  const [risk, setRisk]             = useState<string>("");
  const [diagnosis, setDiagnosis]   = useState<string>("");
  const [notes, setNotes]           = useState<string>("");

  // ── Valores numéricos derivados do estado ─────────────────────────────────
  const numAge  = toNum(age);
  const numCb   = toNum(cb);
  const numDct  = toNum(dct);
  const numAj   = toNum(aj);
  const numKcal = toNum(kcal);
  const numPtn  = toNum(ptn);
  const numAmp  = toNum(ampPct);

  // ── Cálculos em tempo real ────────────────────────────────────────────────
  const cmb = useMemo<number | null>(() => {
    if (numCb === null || numDct === null) return null;
    return numCb - numDct * 0.314;
  }, [numCb, numDct]);

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

  const peBase = useMemo<number | null>(() => {
    if (!group || numAj === null || numCb === null) return null;
    const v = calcGeriatricEstimatedWeightKg(group, numAj, numCb);
    return Number.isFinite(v) ? v : null;
  }, [group, numAj, numCb]);

  const ampPctNum = hasAmputation && numAmp !== null ? numAmp : 0;

  const pe = useMemo<number | null>(() => {
    if (peBase === null) return null;
    if (!hasAmputation || ampPctNum <= 0) return peBase;
    return (peBase * 100) / (100 - ampPctNum);
  }, [peBase, hasAmputation, ampPctNum]);

  const altura = useMemo<number | null>(() => {
    if (!group || numAj === null || numAge === null) return null;
    const v = calcGeriatricEstimatedHeightM(group, numAj, numAge);
    return Number.isFinite(v) ? v : null;
  }, [group, numAj, numAge]);

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

  // ── Fórmulas exibidas ────────────────────────────────────────────────────
  const peFormula = (() => {
    if (!group) return "Selecione o grupo (sexo / etnia)";
    const base = GERIATRIC_PE_FORMULAS[group];
    return hasAmputation && ampPctNum > 0
      ? `(${base}) × 100 ÷ (100 − ${ampPctNum}%)`
      : base;
  })();

  const isMale = group === "homem_branco" || group === "homem_negro";
  const altFormula = !group
    ? "Selecione o grupo (sexo / etnia)"
    : isMale
      ? "(64,19 + 2,04×AJ − 0,04×Idade) ÷ 100"
      : "(84,88 + 1,83×AJ − 0,24×Idade) ÷ 100";

  const imcFormula =
    hasAmputation && ampPctNum > 0
      ? `PE ÷ Altura² × (1 − ${ampPctNum}%)`
      : "PE ÷ Altura²";

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-6">
      <ReturnToHiddenField />
      {/* ── Campos ocultos: identificação + valores calculados ───────────── */}
      <input type="hidden" name="patient_id"          value={patientId} />
      <input type="hidden" name="has_amputation"      value={String(hasAmputation)} />
      <input type="hidden" name="cmb_cm"              value={cmb              !== null ? String(cmb)    : ""} />
      <input type="hidden" name="estimated_weight_kg" value={pe               !== null ? String(pe)     : ""} />
      <input type="hidden" name="estimated_height_m"  value={altura           !== null ? String(altura) : ""} />
      <input type="hidden" name="bmi"                 value={imc              !== null ? String(imc)    : ""} />
      <input type="hidden" name="energy_needs_kcal"   value={ne               !== null ? String(ne)     : ""} />
      <input type="hidden" name="protein_needs_g"     value={np               !== null ? String(np)     : ""} />

      <div className="space-y-4 sm:space-y-5">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            {/* ── Grupo 1: Perfil ─────────────────────────────────────────────── */}
            <AssessmentFormSection
              title="Perfil do paciente"
              description="Equações geriátricas (Chumlea)"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <PatientGroupSelect
                  id="ga-group"
                  value={group}
                  onChange={setGroup}
                  className={selectValueClass(group)}
                  hint="Obrigatório nesta avaliação. Define a equação de peso e altura (Chumlea). Não é copiado do cadastro nem da consulta anterior."
                />

                <div className="space-y-2">
                  <Label htmlFor="ga-age">Idade (anos)</Label>
                  <Input
                    id="ga-age"
                    name="age_years"
                    type="number"
                    min={0}
                    max={130}
                    step={1}
                    inputMode="numeric"
                    placeholder="Ex.: 80"
                    className="tabular-nums"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <AnthropometricReferenceSelect
                id="ga-anthro-ref"
                value={anthroRef}
                onChange={setAnthroRef}
                className={selectValueClass(anthroRef)}
                required={numCb != null || numDct != null}
              />

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={hasAmputation}
                    onChange={(e) => setHasAmputation(e.target.checked)}
                  />
                  Membro amputado
                </label>

                {hasAmputation && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ga-amp-pct" className="whitespace-nowrap text-sm">
                      % segmento amputado
                    </Label>
                    <Input
                      id="ga-amp-pct"
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
                      coxa=10,0% · perna+pé=5,9% · pé=1,8%
                    </span>
                  </div>
                )}
              </div>
            </AssessmentFormSection>

            {/* ── Grupo 2: Medidas antropométricas ────────────────────────────── */}
            <AssessmentFormSection title="Medidas antropométricas">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ga-cb">CB — circ. do braço (cm)</Label>
                  <Input
                    id="ga-cb"
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
                <div className="space-y-2">
                  <Label htmlFor="ga-dct">DCT — dobra tricipital (mm)</Label>
                  <Input
                    id="ga-dct"
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
                <div className="space-y-2">
                  <Label htmlFor="ga-cp">CP — circ. panturrilha (cm)</Label>
                  <Input
                    id="ga-cp"
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
                <div className="space-y-2">
                  <Label htmlFor="ga-aj">AJ — altura do joelho (cm)</Label>
                  <Input
                    id="ga-aj"
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ga-weight">Peso real (kg)</Label>
                  <Input
                    id="ga-weight"
                    name="weight_real_kg"
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    placeholder="Opcional — deixe vazio se não mensurável"
                    className="max-w-xs tabular-nums"
                    value={weightReal}
                    onChange={(e) => setWeightReal(e.target.value)}
                  />
                </div>
              </div>
            </AssessmentFormSection>
          </div>

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            {/* ── Grupo 3: Valores calculados ──────────────────────────────────── */}
            <AssessmentFormSection
              title="Valores calculados"
              description="Atualizam automaticamente conforme as medidas são preenchidas."
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

            {/* ── Grupo 4: Prescrição energético-proteica ───────────────────────── */}
            <AssessmentFormSection title="Prescrição energético-proteica">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ga-kcal">Kcal/kg · dia</Label>
                  <Input
                    id="ga-kcal"
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
                <div className="space-y-2">
                  <Label htmlFor="ga-ptn">g PTN/kg · dia</Label>
                  <Input
                    id="ga-ptn"
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
                  value={ne !== null ? Math.round(ne).toLocaleString("pt-BR") : "–"}
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

        {/* ── Grupo 5: Avaliação clínica ────────────────────────────────────── */}
        <AssessmentFormSection title="Avaliação clínica">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ga-risk">Risco nutricional</Label>
              <select
                id="ga-risk"
                name="nutritional_risk"
                className={selectValueClass(risk)}
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
              >
                <option value="">— não avaliado —</option>
                {(Object.entries(NUTRITIONAL_RISK_LABELS) as [NutritionalRisk, string][]).map(
                  ([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ga-diagnosis">Diagnóstico nutricional</Label>
              <Input
                id="ga-diagnosis"
                name="nutritional_diagnosis"
                placeholder="Ex.: SRD-19, SRN-12, D-16 (opcional)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="ga-notes">Notas clínicas</Label>
              <textarea
                id="ga-notes"
                name="clinical_notes"
                rows={3}
                className={textareaClass}
                style={{ minHeight: "72px" }}
                placeholder="Condicionantes, medicação com impacto nutricional, objetivos… (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </AssessmentFormSection>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
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
          Cada envio cria um novo registo com data e hora — o histórico anterior
          não é alterado.
        </p>
      </div>
    </form>
  );
}
