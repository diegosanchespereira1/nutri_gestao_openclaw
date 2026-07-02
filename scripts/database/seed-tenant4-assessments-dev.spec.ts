/**
 * Popula avaliações nutricionais de demonstração (adulto + infantil) no tenant 4 — DEV.
 *
 * Uso: npx vitest run scripts/database/seed-tenant4-assessments-dev.spec.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { assessChild } from "@/lib/nutrition/child/assess";
import { ageInMonthsFromISO } from "@/lib/nutrition/child/age";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const TENANT4_OWNER_USER_ID = "7454b097-225e-411b-8442-d8d5bfb4a7a2";
const DEMO_USER_ID = "daa5a5f4-b938-416f-81a8-0f4bceff1af0";
const DEMO_USER_EMAIL = "demo@nutrigestao.com.br";
/** Senha padrão do usuário demo na DEV — não alterar no seed. */
const DEMO_USER_PASSWORD = "Demo@123";
const DEMO_MARKER = "[Demo]";

function assertDevUrl() {
  if (!url?.includes("dbhmlnutricao.stratostech.com.br")) {
    throw new Error("Abortado: só pode rodar na base DEV (dbhmlnutricao).");
  }
  if (!url || !serviceKey || !anonKey) {
    throw new Error("Defina SUPABASE URL/keys em .env.local");
  }
}

function isoAt(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function getAuthenticatedClient(
  admin: SupabaseClient,
): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let { error } = await client.auth.signInWithPassword({
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
  });

  // Garante senha conhecida na DEV se alguém tiver alterado manualmente.
  if (error) {
    await admin.auth.admin.updateUserById(DEMO_USER_ID, {
      password: DEMO_USER_PASSWORD,
      email_confirm: true,
    });
    ({ error } = await client.auth.signInWithPassword({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
    }));
  }

  if (error) throw error;
  return client;
}

describe("seed tenant4 assessments (DEV)", () => {
  it("insere avaliações adultas e infantis de demonstração", async () => {
    assertDevUrl();
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });

    const { data: ana } = await admin
      .from("patients")
      .select("id")
      .eq("user_id", TENANT4_OWNER_USER_ID)
      .eq("full_name", "Ana Paula Ferreira")
      .maybeSingle();
    expect(ana?.id).toBeTruthy();
    const anaId = ana!.id;

    const { data: existingAdult } = await admin
      .from("patient_adult_nutrition_assessments")
      .select("id")
      .eq("patient_id", anaId)
      .like("clinical_notes", `${DEMO_MARKER}%`)
      .limit(1);
    if (existingAdult?.length) return;

    const { data: pfClient } = await admin
      .from("clients")
      .select("id")
      .eq("owner_user_id", TENANT4_OWNER_USER_ID)
      .like("legal_name", `${DEMO_MARKER}%`)
      .eq("kind", "pf")
      .maybeSingle();
    expect(pfClient?.id).toBeTruthy();

    let { data: sofia } = await admin
      .from("patients")
      .select("id, birth_date, sex")
      .eq("user_id", TENANT4_OWNER_USER_ID)
      .eq("full_name", `${DEMO_MARKER} Sofia Martins`)
      .maybeSingle();

    if (!sofia) {
      const { data: created, error } = await admin
        .from("patients")
        .insert({
          user_id: TENANT4_OWNER_USER_ID,
          client_id: pfClient!.id,
          full_name: `${DEMO_MARKER} Sofia Martins`,
          birth_date: "2020-06-15",
          sex: "female",
          notes: "Criança de demonstração — acompanhamento nutricional infantil.",
        })
        .select("id, birth_date, sex")
        .single();
      if (error) throw error;
      sofia = created;
    }

    const adultRows = [
      {
        recorded_at: isoAt(180),
        age_years: 37,
        weight_real_kg: 78,
        cb_cm: 32,
        aj_cm: 28,
        estimated_height_m: 1.62,
        estimated_weight_kg: 78,
        bmi: 29.7,
        cmb_cm: 24.5,
        kcal_per_kg: 25,
        energy_needs_kcal: 1950,
        ptn_per_kg: 1.2,
        protein_needs_g: 93.6,
        nutritional_risk: "s_rn" as const,
        nutritional_diagnosis: "Sobrepeso — plano hipocalórico moderado.",
        clinical_notes: `${DEMO_MARKER} Consulta inicial — reeducação alimentar.`,
      },
      {
        recorded_at: isoAt(120),
        age_years: 37,
        weight_real_kg: 75,
        cb_cm: 31.5,
        aj_cm: 27.5,
        estimated_height_m: 1.62,
        estimated_weight_kg: 75,
        bmi: 28.6,
        cmb_cm: 24,
        kcal_per_kg: 24,
        energy_needs_kcal: 1800,
        ptn_per_kg: 1.2,
        protein_needs_g: 90,
        nutritional_risk: "s_rn" as const,
        nutritional_diagnosis: "Sobrepeso — evolução favorável.",
        clinical_notes: `${DEMO_MARKER} Retorno 1 — perda de 3 kg.`,
      },
      {
        recorded_at: isoAt(60),
        age_years: 38,
        weight_real_kg: 72,
        cb_cm: 31,
        aj_cm: 27,
        estimated_height_m: 1.62,
        estimated_weight_kg: 72,
        bmi: 27.4,
        cmb_cm: 23.5,
        kcal_per_kg: 23,
        energy_needs_kcal: 1656,
        ptn_per_kg: 1.1,
        protein_needs_g: 79.2,
        nutritional_risk: "c_rn" as const,
        nutritional_diagnosis: "Peso em redução — manter orientações.",
        clinical_notes: `${DEMO_MARKER} Retorno 2 — adesão boa ao plano.`,
      },
      {
        recorded_at: isoAt(14),
        age_years: 38,
        weight_real_kg: 69,
        cb_cm: 30.5,
        aj_cm: 26.5,
        estimated_height_m: 1.62,
        estimated_weight_kg: 69,
        bmi: 26.3,
        cmb_cm: 23,
        kcal_per_kg: 22,
        energy_needs_kcal: 1518,
        ptn_per_kg: 1.1,
        protein_needs_g: 75.9,
        nutritional_risk: "c_rn" as const,
        nutritional_diagnosis: "Sobrepeso leve — meta quase atingida.",
        clinical_notes: `${DEMO_MARKER} Retorno 3 — evolução consistente.`,
      },
    ].map((row) => ({
      patient_id: anaId,
      patient_group: "mulher_branca" as const,
      has_amputation: false,
      dct_mm: 18,
      cp_cm: 95,
      ...row,
    }));

    const { error: adultErr } = await admin
      .from("patient_adult_nutrition_assessments")
      .insert(adultRows);
    if (adultErr) throw adultErr;

    const childSessions = [
      { daysAgo: 150, weightKg: 18.2, heightCm: 108 },
      { daysAgo: 100, weightKg: 19.1, heightCm: 110 },
      { daysAgo: 50, weightKg: 19.8, heightCm: 112 },
      { daysAgo: 10, weightKg: 20.4, heightCm: 114 },
    ];

    const childRows = childSessions.map(({ daysAgo, weightKg, heightCm }, i) => {
      const recordedAt = isoAt(daysAgo, 11);
      const ageMonths = ageInMonthsFromISO(sofia!.birth_date!, recordedAt);
      if (ageMonths == null) {
        throw new Error("Idade em meses inválida para Sofia.");
      }
      const assessment = assessChild({
        sex: "female",
        ageMonths,
        weightKg,
        heightCm,
        method: "percentile",
      });
      return {
        patient_id: sofia!.id,
        recorded_at: recordedAt,
        sex: "female" as const,
        age_months: ageMonths,
        weight_kg: weightKg,
        height_cm: heightCm,
        measured_lying: false,
        classification_method: "percentile" as const,
        bmi: assessment.bmi,
        results: assessment.indicators,
        clinical_notes: `${DEMO_MARKER} Avaliação infantil ${i + 1}/4 — crescimento acompanhado.`,
      };
    });

    const authClient = await getAuthenticatedClient(admin);
    const { error: childErr } = await authClient
      .from("patient_child_assessments")
      .insert(childRows);
    if (childErr) throw childErr;

    await authClient.auth.signOut();
  }, 60_000);
});
