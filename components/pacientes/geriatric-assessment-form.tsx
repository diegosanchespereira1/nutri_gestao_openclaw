"use client";

import { useActionState, useMemo, useState } from "react";

import {
  type GeriatricAssessmentFormResult,
  createGeriatricAssessmentAction,
} from "@/lib/actions/geriatric-assessments";
import {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
  type PatientGroup,
  type NutritionalRisk,
} from "@/lib/types/geriatric-assessments";
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

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

// ── Fórmulas de Peso Estimado (Chumlea et al., 1988) ─────────────────────────
function calcPeBase(group: PatientGroup, aj: number, cb: number): number {
  switch (group) {
    case "mulher_branca": return aj * 1.09 + cb * 2.68 - 65.51;
    case "mulher_negra":  return aj * 1.50 + cb * 2.58 - 84.22;
    case "homem_branco":  return aj * 1.10 + cb * 3.07 - 75.81;
    case "homem_negro":   return aj * 0.44 + cb * 2.86 - 39.21;
  }
}

// ── Fórmulas de Altura Estimada (Chumlea et al., 1985) ───────────────────────
function calcAlturaBase(group: PatientGroup, aj: number, age: number): number {
  const isMale = group === "homem_branco" || group === "homem_negro";
  return isMale
    ? (64.19 + 2.04 * aj - 0.04 * age) / 100
    : (84.88 + 1.83 * aj - 0.24 * age) / 100;
}

function toNum(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

// ── Caixa de valor calculado ──────────────────────────────────────────────────
function CalcBox({
  label,
  value,
  unit,
  formula,
}: {
  label: string;
  value: string;
  unit: string;
  formula: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
        {value}{" "}
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] italic text-muted-foreground">{formula}</p>
    </div>
  );
}

// ── Tipos auxiliares ──────────────────────────────────────────────────────────
type NumericField = string; // valor string do input; converte para número só no cálculo

export function GeriatricAssessmentForm({
  patientId,
  defaultAge,
}: {
  patientId: string;
  defaultAge?: number;
}) {
  const [state, formAction] = useActionState(createGeriatricAssessmentAction, initial);

  // ── Estado dos inputs (todos controlados para preservar valores em re-render) ─
  const [group, setGroup]               = useState<PatientGroup>("mulher_branca");
  const [hasAmputation, setHasAmputation] = useState(false);
  const [ampPct, setAmpPct]             = useState<NumericField>("5.9");

  const [age, setAge]               = useState<NumericField>(defaultAge != null ? String(defaultAge) : "");
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

  const peBase = useMemo<number | null>(() => {
    if (numAj === null || numCb === null) return null;
    const v = calcPeBase(group, numAj, numCb);
    return Number.isFinite(v) ? v : null;
  }, [group, numAj, numCb]);

  const ampPctNum = hasAmputation && numAmp !== null ? numAmp : 0;

  const pe = useMemo<number | null>(() => {
    if (peBase === null) return null;
    if (!hasAmputation || ampPctNum <= 0) return peBase;
    return (peBase * 100) / (100 - ampPctNum);
  }, [peBase, hasAmputation, ampPctNum]);

  const altura = useMemo<number | null>(() => {
    if (numAj === null || numAge === null) return null;
    const v = calcAlturaBase(group, numAj, numAge);
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
    const baseMap: Record<PatientGroup, string> = {
      mulher_branca: "AJ×1,09 + CB×2,68 − 65,51",
      mulher_negra:  "AJ×1,50 + CB×2,58 − 84,22",
      homem_branco:  "AJ×1,10 + CB×3,07 − 75,81",
      homem_negro:   "AJ×0,44 + CB×2,86 − 39,21",
    };
    const base = baseMap[group];
    return hasAmputation && ampPctNum > 0
      ? `(${base}) × 100 ÷ (100 − ${ampPctNum}%)`
      : base;
  })();

  const isMale = group === "homem_branco" || group === "homem_negro";
  const altFormula = isMale
    ? "(64,19 + 2,04×AJ − 0,04×Idade) ÷ 100"
    : "(84,88 + 1,83×AJ − 0,24×Idade) ÷ 100";

  const imcFormula =
    hasAmputation && ampPctNum > 0
      ? `PE ÷ Altura² × (1 − ${ampPctNum}%)`
      : "PE ÷ Altura²";

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Campos ocultos: identificação + valores calculados ───────────── */}
      <input type="hidden" name="patient_id"          value={patientId} />
      <input type="hidden" name="has_amputation"      value={String(hasAmputation)} />
      <input type="hidden" name="cmb_cm"              value={cmb              !== null ? String(cmb)    : ""} />
      <input type="hidden" name="estimated_weight_kg" value={pe               !== null ? String(pe)     : ""} />
      <input type="hidden" name="estimated_height_m"  value={altura           !== null ? String(altura) : ""} />
      <input type="hidden" name="bmi"                 value={imc              !== null ? String(imc)    : ""} />
      <input type="hidden" name="energy_needs_kcal"   value={ne               !== null ? String(ne)     : ""} />
      <input type="hidden" name="protein_needs_g"     value={np               !== null ? String(np)     : ""} />

      {/* ── Grupo 1: Perfil ─────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Perfil do paciente</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ga-group">Grupo (sexo / etnia)</Label>
            <select
              id="ga-group"
              name="patient_group"
              className={selectClass}
              value={group}
              onChange={(e) => setGroup(e.target.value as PatientGroup)}
            >
              {(Object.entries(PATIENT_GROUP_LABELS) as [PatientGroup, string][]).map(
                ([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ),
              )}
            </select>
            <p className="text-xs text-muted-foreground">
              Define a equação de Peso Estimado e Altura (Chumlea et al.)
            </p>
          </div>

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
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 2: Medidas antropométricas ────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Medidas antropométricas</legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ga-cb">CB — Circ. do Braço (cm)</Label>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="ga-dct">DCT — Dobra Cutânea Tricipital (mm)</Label>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="ga-cp">CP — Circ. da Panturrilha (cm)</Label>
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
        </div>

        {/* CMB calculado em destaque */}
        <CalcBox
          label="CMB — Circunferência Muscular do Braço"
          value={fmt(cmb)}
          unit="cm"
          formula="CMB = CB − (DCT × 0,314)   [Gurney & Jelliffe, 1973]"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ga-aj">AJ — Altura do Joelho (cm)</Label>
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
          <div className="space-y-2">
            <Label htmlFor="ga-weight">Peso Real (kg)</Label>
            <Input
              id="ga-weight"
              name="weight_real_kg"
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              placeholder="Opcional — deixe vazio se não mensurável"
              className="tabular-nums"
              value={weightReal}
              onChange={(e) => setWeightReal(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 3: Valores calculados ──────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Valores calculados automaticamente</legend>
        <p className="text-xs text-muted-foreground">
          Atualizados em tempo real conforme as medidas são preenchidas acima.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <CalcBox
            label="Peso Estimado"
            value={fmt(pe)}
            unit="kg"
            formula={peFormula}
          />
          <CalcBox
            label="Altura Estimada"
            value={fmt(altura, 3)}
            unit="m"
            formula={altFormula}
          />
          <CalcBox
            label="IMC"
            value={fmt(imc)}
            unit="kg/m²"
            formula={imcFormula}
          />
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 4: Prescrição energético-proteica ───────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Prescrição energético-proteica</legend>

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
          <CalcBox
            label="Necessidade Energética"
            value={ne !== null ? Math.round(ne).toLocaleString("pt-BR") : "–"}
            unit="kcal/dia"
            formula="NE = Peso Estimado × Kcal/kg"
          />
          <CalcBox
            label="Necessidade Proteica"
            value={fmt(np, 1)}
            unit="g/dia"
            formula="NP = g PTN/kg × Peso Estimado"
          />
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 5: Avaliação clínica ────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Avaliação clínica</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ga-risk">Risco Nutricional</Label>
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
        </div>

        <div className="space-y-2">
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
      </fieldset>

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
