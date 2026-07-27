/**
 * Substitui as avaliações adultas do paciente mock "Adulto masc" (DEV)
 * por uma série completa a cada 15 dias nos últimos 6 meses — para validar
 * gráficos/históricos da tab Indicadores.
 *
 * Uso:
 *   npx vitest run --config scripts/database/vitest.seed.config.ts \
 *     scripts/database/seed-adulto-masc-indicators-dev.spec.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  calcAdultEstimatedHeightM,
  calcAdultEstimatedWeightKg,
} from "@/lib/nutrition/adult-anthropometry";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PATIENT_ID = "376a2bc0-b599-46d9-b43d-833ad0f100bd";
const PATIENT_NAME = "Adulto masc";
const DEMO_MARKER = "[MockIndicadores]";
const PATIENT_GROUP = "homem_branco" as const;

/** 6 meses ≈ 180 dias; passo de 15 → 13 pontos (0…180). */
const SPAN_DAYS = 180;
const STEP_DAYS = 15;

function assertDevUrl() {
  if (!url?.includes("dbhmlnutricao.stratostech.com.br")) {
    throw new Error("Abortado: só pode rodar na base DEV (dbhmlnutricao).");
  }
  if (!url || !serviceKey) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  }
}

function isoAtDaysAgo(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function ageYearsOn(iso: string, birthDate: string): number {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  const at = new Date(iso);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const m = at.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

describe("seed Adulto masc indicadores (DEV)", () => {
  it("substitui avaliações adultas por série a cada 15 dias / 6 meses", async () => {
    assertDevUrl();
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });

    const { data: patient, error: patientErr } = await admin
      .from("patients")
      .select("id, full_name, birth_date, sex")
      .eq("id", PATIENT_ID)
      .maybeSingle();
    if (patientErr) throw patientErr;
    expect(patient?.id).toBe(PATIENT_ID);
    expect(patient?.full_name).toBe(PATIENT_NAME);

    const birthDate = patient!.birth_date ?? "1983-01-01";

    const { error: delErr } = await admin
      .from("patient_adult_nutrition_assessments")
      .delete()
      .eq("patient_id", PATIENT_ID);
    if (delErr) throw delErr;

    const points: number[] = [];
    for (let daysAgo = SPAN_DAYS; daysAgo >= 0; daysAgo -= STEP_DAYS) {
      points.push(daysAgo);
    }

    const rows = points.map((daysAgo, index) => {
      const t = index / (points.length - 1);
      const recorded_at = isoAtDaysAgo(daysAgo, 10);
      const age_years = ageYearsOn(recorded_at, birthDate);

      // Evolução coerente: perda gradual de peso / medidas ao longo de 6 meses.
      const weight_real_kg = round(lerp(82, 74.5, t), 2);
      const cb_cm = round(lerp(31.4, 29.2, t), 2);
      const dct_mm = round(lerp(16.5, 13.5, t), 2);
      const cp_cm = round(lerp(37.5, 35.0, t), 2);
      const aj_cm = round(lerp(49.2, 48.6, t), 2);

      const cmb_cm = round(cb_cm - dct_mm * 0.314, 2);
      const estimated_weight_kg = round(
        calcAdultEstimatedWeightKg(aj_cm, cb_cm),
        2,
      );
      const estimated_height_m = round(
        calcAdultEstimatedHeightM(PATIENT_GROUP, aj_cm, age_years) ?? 0,
        3,
      );
      const bmi = round(
        estimated_weight_kg / (estimated_height_m * estimated_height_m),
        2,
      );

      const kcal_per_kg = round(lerp(28, 25, t), 1);
      const ptn_per_kg = round(lerp(1.3, 1.2, t), 2);
      const energy_needs_kcal = round(estimated_weight_kg * kcal_per_kg, 1);
      const protein_needs_g = round(estimated_weight_kg * ptn_per_kg, 1);

      const nutritional_risk = t < 0.55 ? ("c_rn" as const) : ("s_rn" as const);
      const n = index + 1;
      const total = points.length;

      return {
        patient_id: PATIENT_ID,
        recorded_at,
        patient_group: PATIENT_GROUP,
        has_amputation: false,
        amputation_segment_pct: null,
        age_years,
        cb_cm,
        dct_mm,
        cp_cm,
        aj_cm,
        weight_real_kg,
        cmb_cm,
        estimated_weight_kg,
        estimated_height_m,
        bmi,
        kcal_per_kg,
        energy_needs_kcal,
        ptn_per_kg,
        protein_needs_g,
        nutritional_risk,
        nutritional_diagnosis:
          nutritional_risk === "c_rn"
            ? "Sobrepeso — plano de redução gradual."
            : "Evolução favorável — manter orientações.",
        clinical_notes: `${DEMO_MARKER} Avaliação ${n}/${total} — série mock a cada 15 dias (6 meses).`,
      };
    });

    const { error: insErr } = await admin
      .from("patient_adult_nutrition_assessments")
      .insert(rows);
    if (insErr) throw insErr;

    const { count } = await admin
      .from("patient_adult_nutrition_assessments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", PATIENT_ID)
      .like("clinical_notes", `${DEMO_MARKER}%`);

    expect(count).toBe(points.length);
    expect(points.length).toBe(13);
  }, 60_000);
});
