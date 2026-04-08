import { GeriatricAssessmentForm } from "@/components/pacientes/geriatric-assessment-form";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
  type GeriatricAssessmentRow,
} from "@/lib/types/geriatric-assessments";

function fmt(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

function formatRecordedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function GeriatricAssessmentHistoryCard({ row }: { row: GeriatricAssessmentRow }) {
  const riskLabel =
    row.nutritional_risk ? NUTRITIONAL_RISK_LABELS[row.nutritional_risk] : null;

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
      <details className="group">
        <summary className="cursor-pointer list-none px-4 py-3 transition-colors hover:bg-muted/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm font-medium text-foreground">
              {formatRecordedAt(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              {PATIENT_GROUP_LABELS[row.patient_group]}
              {row.has_amputation ? " · Amputado" : ""}
              {summary ? ` · ${summary}` : ""}
            </span>
          </div>
        </summary>

        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
          {/* ── Medidas ──────────────────────────────────────────────────── */}
          <div>
            <p className={legendClass}>Medidas antropométricas</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <DataItem label="CB" value={row.cb_cm != null ? `${fmt(row.cb_cm)} cm` : "–"} />
              <DataItem label="DCT" value={row.dct_mm != null ? `${fmt(row.dct_mm)} mm` : "–"} />
              <DataItem label="CMB" value={row.cmb_cm != null ? `${fmt(row.cmb_cm)} cm` : "–"} />
              <DataItem label="CP" value={row.cp_cm != null ? `${fmt(row.cp_cm)} cm` : "–"} />
              <DataItem label="AJ" value={row.aj_cm != null ? `${fmt(row.aj_cm)} cm` : "–"} />
              <DataItem
                label="Peso Real"
                value={row.weight_real_kg != null ? `${fmt(row.weight_real_kg)} kg` : "–"}
              />
            </dl>
          </div>

          {/* ── Valores calculados ────────────────────────────────────────── */}
          <div>
            <p className={legendClass}>Valores calculados</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <DataItem
                label="Peso Estimado"
                value={row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–"}
                highlight
              />
              <DataItem
                label="Altura Estimada"
                value={row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–"}
              />
              <DataItem
                label="IMC"
                value={row.bmi != null ? `${fmt(row.bmi)} kg/m²` : "–"}
                highlight
              />
            </dl>
          </div>

          {/* ── Prescrição ────────────────────────────────────────────────── */}
          {(row.kcal_per_kg != null || row.ptn_per_kg != null) ? (
            <div>
              <p className={legendClass}>Prescrição energético-proteica</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <DataItem
                  label="Nec. Energética"
                  value={row.energy_needs_kcal != null ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")} kcal/dia` : "–"}
                  highlight
                />
                <DataItem
                  label="Nec. Proteica"
                  value={row.protein_needs_g != null ? `${fmt(row.protein_needs_g, 1)} g/dia` : "–"}
                  highlight
                />
              </dl>
            </div>
          ) : null}

          {/* ── Avaliação clínica ─────────────────────────────────────────── */}
          {(riskLabel || row.nutritional_diagnosis || row.clinical_notes) ? (
            <div className="space-y-2">
              <p className={legendClass}>Avaliação clínica</p>
              {riskLabel ? (
                <p>
                  <span className="font-medium">Risco nutricional: </span>
                  {riskLabel}
                </p>
              ) : null}
              {row.nutritional_diagnosis ? (
                <p>
                  <span className="font-medium">Diagnóstico: </span>
                  {row.nutritional_diagnosis}
                </p>
              ) : null}
              {row.clinical_notes ? (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {row.clinical_notes}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

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
      <dd
        className={
          highlight
            ? "font-mono font-semibold tabular-nums text-foreground"
            : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export async function GeriatricAssessmentsSection({
  patientId,
  defaultAge,
}: {
  patientId: string;
  defaultAge?: number;
}) {
  const { rows } = await loadGeriatricAssessmentsForPatient(patientId);

  return (
    <div className="space-y-6" aria-label="Avaliações geriátricas">
      <GeriatricAssessmentForm patientId={patientId} defaultAge={defaultAge} />

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Histórico de avaliações para idosos
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há avaliações geriátricas. Utilize o formulário acima para
            o primeiro registo.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Histórico de avaliações geriátricas">
            {rows.map((r) => (
              <GeriatricAssessmentHistoryCard key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
