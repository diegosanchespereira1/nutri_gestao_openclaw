"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  GeriatricAssessmentRow,
  PatientGroup,
  NutritionalRisk,
} from "@/lib/types/geriatric-assessments";

export type GeriatricAssessmentFormResult =
  | { ok: true }
  | { ok: false; error: string };

function parseDec(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parsePatientGroup(raw: FormDataEntryValue | null): PatientGroup | null {
  const s = String(raw ?? "").trim();
  const valid: PatientGroup[] = ["mulher_branca", "mulher_negra", "homem_branco", "homem_negro"];
  return valid.includes(s as PatientGroup) ? (s as PatientGroup) : null;
}

function parseRisk(raw: FormDataEntryValue | null): NutritionalRisk | null {
  const s = String(raw ?? "").trim();
  if (s === "s_rn" || s === "c_rn") return s;
  return null;
}

export async function loadGeriatricAssessmentsForPatient(
  patientId: string,
): Promise<{ rows: GeriatricAssessmentRow[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("patient_geriatric_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as GeriatricAssessmentRow[] };
}

export async function createGeriatricAssessmentAction(
  _prev: GeriatricAssessmentFormResult | undefined,
  formData: FormData,
): Promise<GeriatricAssessmentFormResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "").trim();
  if (!patientId) return { ok: false, error: "Paciente em falta." };

  const { data: patient } = await supabase
    .from("patients")
    .select("id, client_id")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) return { ok: false, error: "Paciente não encontrado." };

  const { data: clientRow } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", patient.client_id)
    .maybeSingle();

  if (!clientRow || clientRow.owner_user_id !== user.id) {
    return { ok: false, error: "Sem permissão para este paciente." };
  }

  const patient_group = parsePatientGroup(formData.get("patient_group"));
  if (!patient_group) {
    return { ok: false, error: "Selecione o grupo do paciente." };
  }

  const has_amputation = formData.get("has_amputation") === "true";
  const amputation_segment_pct = has_amputation
    ? parseDec(formData.get("amputation_segment_pct"))
    : null;

  const age_years         = parseDec(formData.get("age_years"));
  const cb_cm             = parseDec(formData.get("cb_cm"));
  const dct_mm            = parseDec(formData.get("dct_mm"));
  const cp_cm             = parseDec(formData.get("cp_cm"));
  const aj_cm             = parseDec(formData.get("aj_cm"));
  const weight_real_kg    = parseDec(formData.get("weight_real_kg"));

  // Calculated values sent from client
  const cmb_cm              = parseDec(formData.get("cmb_cm"));
  const estimated_weight_kg = parseDec(formData.get("estimated_weight_kg"));
  const estimated_height_m  = parseDec(formData.get("estimated_height_m"));
  const bmi                 = parseDec(formData.get("bmi"));
  const kcal_per_kg         = parseDec(formData.get("kcal_per_kg"));
  const energy_needs_kcal   = parseDec(formData.get("energy_needs_kcal"));
  const ptn_per_kg          = parseDec(formData.get("ptn_per_kg"));
  const protein_needs_g     = parseDec(formData.get("protein_needs_g"));
  const nutritional_risk    = parseRisk(formData.get("nutritional_risk"));
  const nutritional_diagnosis = String(formData.get("nutritional_diagnosis") ?? "").trim() || null;
  const clinical_notes      = String(formData.get("clinical_notes") ?? "").trim() || null;

  const hasAny =
    cb_cm != null || dct_mm != null || cp_cm != null || aj_cm != null ||
    weight_real_kg != null || age_years != null || nutritional_risk != null ||
    nutritional_diagnosis != null || clinical_notes != null;

  if (!hasAny) {
    return { ok: false, error: "Preencha pelo menos um campo da avaliação." };
  }

  const { error } = await supabase
    .from("patient_geriatric_assessments")
    .insert({
      patient_id: patientId,
      patient_group,
      has_amputation,
      amputation_segment_pct,
      age_years: age_years != null ? Math.round(age_years) : null,
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
      nutritional_diagnosis,
      clinical_notes,
    });

  if (error) {
    // Log server-side para diagnóstico (visível nos logs Next.js / Vercel)
    console.error("[geriatric-assessments] Supabase insert error:", error);
    const detail =
      process.env.NODE_ENV === "development"
        ? ` [${error.code ?? "?"}: ${error.message}]`
        : "";
    return { ok: false, error: `Não foi possível guardar a avaliação.${detail}` };
  }

  revalidatePath(`/pacientes/${patientId}/editar`);
  redirect(`/pacientes/${patientId}/editar?avaliacao=ok`);
}
