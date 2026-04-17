"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil, Trash2, X, Check, Loader2 } from "lucide-react";

import {
  deleteGeriatricAssessmentAction,
  updateGeriatricAssessmentAction,
} from "@/lib/actions/geriatric-assessments";
import {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
  type GeriatricAssessmentRow,
  type PatientGroup,
  type NutritionalRisk,
} from "@/lib/types/geriatric-assessments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Estilos partilhados ───────────────────────────────────────────────────────
const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-foreground";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function selectValueClass(value: string) {
  return cn(selectClass, value === "" && "text-muted-foreground");
}

// ── Helpers de cálculo (espelham geriatric-assessment-form.tsx) ───────────────
function calcPeBase(group: PatientGroup, aj: number, cb: number): number {
  switch (group) {
    case "mulher_branca": return aj * 1.09 + cb * 2.68 - 65.51;
    case "mulher_negra":  return aj * 1.50 + cb * 2.58 - 84.22;
    case "homem_branco":  return aj * 1.10 + cb * 3.07 - 75.81;
    case "homem_negro":   return aj * 0.44 + cb * 2.86 - 39.21;
  }
}

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

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

// ── Caixa de valor calculado (leve, inline) ───────────────────────────────────
function CalcBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-bold tabular-nums text-foreground">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

// ── Data item para view ───────────────────────────────────────────────────────
function DataItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={highlight ? "font-mono font-semibold tabular-nums text-foreground" : "tabular-nums text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

// ── Formatação de data ────────────────────────────────────────────────────────
function formatRecordedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Mode = "view" | "edit" | "confirm-delete";

// ── Formulário de edição inline ───────────────────────────────────────────────
function EditForm({
  row,
  onCancel,
}: {
  row: GeriatricAssessmentRow;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateGeriatricAssessmentAction,
    undefined,
  );

  // Todos os inputs controlados para preservar valores em re-renders
  const [group, setGroup] = useState<PatientGroup>(row.patient_group ?? "mulher_branca");
  const [hasAmputation, setHasAmputation] = useState(row.has_amputation ?? false);
  const [ampPct, setAmpPct] = useState(String(row.amputation_segment_pct ?? "5.9"));
  const [age, setAge] = useState(String(row.age_years ?? ""));
  const [cb, setCb] = useState(String(row.cb_cm ?? ""));
  const [dct, setDct] = useState(String(row.dct_mm ?? ""));
  const [cp, setCp] = useState(String(row.cp_cm ?? ""));
  const [aj, setAj] = useState(String(row.aj_cm ?? ""));
  const [weightReal, setWeightReal] = useState(String(row.weight_real_kg ?? ""));
  const [kcal, setKcal] = useState(String(row.kcal_per_kg ?? ""));
  const [ptn, setPtn] = useState(String(row.ptn_per_kg ?? ""));
  const [risk, setRisk] = useState<string>(row.nutritional_risk ?? "");
  const [diagnosis, setDiagnosis] = useState(row.nutritional_diagnosis ?? "");
  const [notes, setNotes] = useState(row.clinical_notes ?? "");

  // Cálculos em tempo real
  const numAj   = toNum(aj);
  const numCb   = toNum(cb);
  const numDct  = toNum(dct);
  const numAge  = toNum(age);
  const numKcal = toNum(kcal);
  const numPtn  = toNum(ptn);
  const numAmp  = toNum(ampPct);

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

  return (
    <form action={formAction} className="space-y-5 border-t border-border bg-card px-4 py-4">
      <input type="hidden" name="assessment_id" value={row.id} />
      <input type="hidden" name="has_amputation" value={String(hasAmputation)} />
      <input type="hidden" name="cmb_cm" value={cmb !== null ? String(cmb) : ""} />
      <input type="hidden" name="estimated_weight_kg" value={pe !== null ? String(pe) : ""} />
      <input type="hidden" name="estimated_height_m" value={altura !== null ? String(altura) : ""} />
      <input type="hidden" name="bmi" value={imc !== null ? String(imc) : ""} />
      <input type="hidden" name="energy_needs_kcal" value={ne !== null ? String(ne) : ""} />
      <input type="hidden" name="protein_needs_g" value={np !== null ? String(np) : ""} />

      {/* Perfil */}
      <fieldset className="space-y-3">
        <legend className={legendClass}>Perfil do paciente</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`eg-group-${row.id}`} className="text-xs">Grupo (sexo / etnia)</Label>
            <select
              id={`eg-group-${row.id}`}
              name="patient_group"
              className={selectClass}
              value={group}
              onChange={(e) => setGroup(e.target.value as PatientGroup)}
            >
              {(Object.entries(PATIENT_GROUP_LABELS) as [PatientGroup, string][]).map(
                ([val, label]) => <option key={val} value={val}>{label}</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-age-${row.id}`} className="text-xs">Idade (anos)</Label>
            <Input
              id={`eg-age-${row.id}`}
              name="age_years"
              type="number"
              min={0} max={130} step={1}
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
              <Label htmlFor={`eg-amp-${row.id}`} className="whitespace-nowrap text-xs">% segmento</Label>
              <Input
                id={`eg-amp-${row.id}`}
                name="amputation_segment_pct"
                type="number" min={0.1} max={99.9} step={0.1}
                className="w-20 tabular-nums"
                value={ampPct}
                onChange={(e) => setAmpPct(e.target.value)}
              />
            </div>
          )}
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* Medidas antropométricas */}
      <fieldset className="space-y-3">
        <legend className={legendClass}>Medidas antropométricas</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`eg-cb-${row.id}`} className="text-xs">CB (cm)</Label>
            <Input id={`eg-cb-${row.id}`} name="cb_cm" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Ex.: 23" className="tabular-nums" value={cb} onChange={(e) => setCb(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-dct-${row.id}`} className="text-xs">DCT (mm)</Label>
            <Input id={`eg-dct-${row.id}`} name="dct_mm" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Ex.: 8" className="tabular-nums" value={dct} onChange={(e) => setDct(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-cp-${row.id}`} className="text-xs">CP (cm)</Label>
            <Input id={`eg-cp-${row.id}`} name="cp_cm" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Ex.: 27" className="tabular-nums" value={cp} onChange={(e) => setCp(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`eg-aj-${row.id}`} className="text-xs">AJ (cm)</Label>
            <Input id={`eg-aj-${row.id}`} name="aj_cm" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Ex.: 48,5" className="tabular-nums" value={aj} onChange={(e) => setAj(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-wr-${row.id}`} className="text-xs">Peso Real (kg)</Label>
            <Input id={`eg-wr-${row.id}`} name="weight_real_kg" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Opcional" className="tabular-nums" value={weightReal} onChange={(e) => setWeightReal(e.target.value)} />
          </div>
        </div>

        {/* CMB calculado */}
        <div className="grid gap-2 sm:grid-cols-3">
          <CalcBox label="CMB" value={fmt(cmb)} unit="cm" />
          <CalcBox label="Peso Estimado" value={fmt(pe)} unit="kg" />
          <CalcBox label="Altura Estimada" value={fmt(altura, 3)} unit="m" />
        </div>
        <CalcBox label="IMC" value={fmt(imc)} unit="kg/m²" />
      </fieldset>

      <div className="border-t border-border" />

      {/* Prescrição */}
      <fieldset className="space-y-3">
        <legend className={legendClass}>Prescrição energético-proteica</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`eg-kcal-${row.id}`} className="text-xs">Kcal/kg · dia</Label>
            <Input id={`eg-kcal-${row.id}`} name="kcal_per_kg" type="number" step="0.5" min={0} inputMode="decimal" placeholder="Ex.: 30" className="tabular-nums" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-ptn-${row.id}`} className="text-xs">g PTN/kg · dia</Label>
            <Input id={`eg-ptn-${row.id}`} name="ptn_per_kg" type="number" step="0.1" min={0} inputMode="decimal" placeholder="Ex.: 1,2" className="tabular-nums" value={ptn} onChange={(e) => setPtn(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <CalcBox label="Nec. Energética" value={ne !== null ? Math.round(ne).toLocaleString("pt-BR") : "–"} unit="kcal/dia" />
          <CalcBox label="Nec. Proteica" value={fmt(np, 1)} unit="g/dia" />
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* Avaliação clínica */}
      <fieldset className="space-y-3">
        <legend className={legendClass}>Avaliação clínica</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`eg-risk-${row.id}`} className="text-xs">Risco Nutricional</Label>
            <select
              id={`eg-risk-${row.id}`}
              name="nutritional_risk"
              className={selectValueClass(risk)}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="">— não avaliado —</option>
              {(Object.entries(NUTRITIONAL_RISK_LABELS) as [NutritionalRisk, string][]).map(
                ([val, label]) => <option key={val} value={val}>{label}</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eg-diag-${row.id}`} className="text-xs">Diagnóstico nutricional</Label>
            <Input
              id={`eg-diag-${row.id}`}
              name="nutritional_diagnosis"
              placeholder="Ex.: SRD-19 (opcional)"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`eg-notes-${row.id}`} className="text-xs">Notas clínicas</Label>
          <textarea
            id={`eg-notes-${row.id}`}
            name="clinical_notes"
            rows={2}
            className={textareaClass}
            placeholder="Opcional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </fieldset>

      {state?.ok === false && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            : <Check className="mr-1.5 h-3.5 w-3.5" />}
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
  row: GeriatricAssessmentRow;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteGeriatricAssessmentAction,
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
        {pending
          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
        Confirmar exclusão
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
    </form>
  );
}

// ── Card principal ────────────────────────────────────────────────────────────
export function GeriatricAssessmentHistoryItem({
  row,
}: {
  row: GeriatricAssessmentRow;
}) {
  const [mode, setMode] = useState<Mode>("view");

  const riskLabel = row.nutritional_risk ? NUTRITIONAL_RISK_LABELS[row.nutritional_risk] : null;
  const summary = [
    row.estimated_weight_kg ? `PE ${fmt(row.estimated_weight_kg)} kg` : null,
    row.bmi ? `IMC ${fmt(row.bmi)}` : null,
    riskLabel ? riskLabel.split("—")[0].trim() : null,
    row.nutritional_diagnosis ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {/* Cabeçalho — sempre visível */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-sm font-medium text-foreground">
            {formatRecordedAt(row.recorded_at)}
          </span>
          <span className="text-xs text-muted-foreground">
            {PATIENT_GROUP_LABELS[row.patient_group]}
            {row.has_amputation ? " · Amputado" : ""}
            {summary ? ` · ${summary}` : ""}
          </span>
        </div>

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
          <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
            {/* Medidas */}
            <div>
              <p className={legendClass}>Medidas antropométricas</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                <DataItem label="CB" value={row.cb_cm != null ? `${fmt(row.cb_cm)} cm` : "–"} />
                <DataItem label="DCT" value={row.dct_mm != null ? `${fmt(row.dct_mm)} mm` : "–"} />
                <DataItem label="CMB" value={row.cmb_cm != null ? `${fmt(row.cmb_cm)} cm` : "–"} />
                <DataItem label="CP" value={row.cp_cm != null ? `${fmt(row.cp_cm)} cm` : "–"} />
                <DataItem label="AJ" value={row.aj_cm != null ? `${fmt(row.aj_cm)} cm` : "–"} />
                <DataItem label="Peso Real" value={row.weight_real_kg != null ? `${fmt(row.weight_real_kg)} kg` : "–"} />
              </dl>
            </div>

            {/* Valores calculados */}
            <div>
              <p className={legendClass}>Valores calculados</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                <DataItem label="Peso Estimado" value={row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–"} highlight />
                <DataItem label="Altura Estimada" value={row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–"} />
                <DataItem label="IMC" value={row.bmi != null ? `${fmt(row.bmi)} kg/m²` : "–"} highlight />
              </dl>
            </div>

            {/* Prescrição */}
            {(row.kcal_per_kg != null || row.ptn_per_kg != null) ? (
              <div>
                <p className={legendClass}>Prescrição energético-proteica</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <DataItem label="Nec. Energética" value={row.energy_needs_kcal != null ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")} kcal/dia` : "–"} highlight />
                  <DataItem label="Nec. Proteica" value={row.protein_needs_g != null ? `${fmt(row.protein_needs_g, 1)} g/dia` : "–"} highlight />
                </dl>
              </div>
            ) : null}

            {/* Avaliação clínica */}
            {(riskLabel || row.nutritional_diagnosis || row.clinical_notes) ? (
              <div className="space-y-1.5">
                <p className={legendClass}>Avaliação clínica</p>
                {riskLabel ? (
                  <p><span className="font-medium">Risco: </span>{riskLabel}</p>
                ) : null}
                {row.nutritional_diagnosis ? (
                  <p><span className="font-medium">Diagnóstico: </span>{row.nutritional_diagnosis}</p>
                ) : null}
                {row.clinical_notes ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{row.clinical_notes}</p>
                ) : null}
              </div>
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
