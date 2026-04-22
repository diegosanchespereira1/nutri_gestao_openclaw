"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseActivityLevel } from "@/lib/constants/activity-levels";
import { createClient } from "@/lib/supabase/server";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type NutritionAssessmentFormResult =
  | { ok: true }
  | { ok: false; error: string };

function parseOptDecimal(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function trimText(raw: string): string | null {
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

export async function loadNutritionAssessmentsForPatient(
  patientId: string,
): Promise<{ rows: NutritionAssessmentRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("patient_nutrition_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as NutritionAssessmentRow[] };
}

export async function createNutritionAssessmentAction(
  _prev: NutritionAssessmentFormResult | undefined,
  formData: FormData,
): Promise<NutritionAssessmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const patientId = String(formData.get("patient_id") ?? "").trim();
  if (!patientId) {
    return { ok: false, error: "Paciente em falta." };
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id, client_id")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) {
    return { ok: false, error: "Paciente não encontrado." };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", patient.client_id)
    .maybeSingle();

  if (!clientRow || clientRow.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Sem permissão para este paciente." };
  }

  const height_cm = parseOptDecimal(String(formData.get("height_cm") ?? ""));
  const weight_kg = parseOptDecimal(String(formData.get("weight_kg") ?? ""));
  const waist_cm = parseOptDecimal(String(formData.get("waist_cm") ?? ""));
  const activity_level = parseActivityLevel(formData.get("activity_level"));
  const diet_notes = trimText(String(formData.get("diet_notes") ?? ""));
  const clinical_notes = trimText(String(formData.get("clinical_notes") ?? ""));
  const goals = trimText(String(formData.get("goals") ?? ""));

  const hasAny =
    height_cm != null ||
    weight_kg != null ||
    waist_cm != null ||
    activity_level != null ||
    diet_notes != null ||
    clinical_notes != null ||
    goals != null;

  if (!hasAny) {
    return {
      ok: false,
      error: "Preencha pelo menos um campo da avaliação.",
    };
  }

  const { error } = await supabase.from("patient_nutrition_assessments").insert({
    patient_id: patientId,
    height_cm,
    weight_kg,
    waist_cm,
    activity_level,
    diet_notes,
    clinical_notes,
    goals,
  });

  if (error) {
    return { ok: false, error: "Não foi possível salvar a avaliação." };
  }

  revalidatePath(`/pacientes/${patientId}/editar`);
  revalidatePath(`/pacientes/${patientId}/historico`);
  redirect(`/pacientes/${patientId}/editar?avaliacao=ok`);
}

// ── Helpers de permissão ──────────────────────────────────────────────────────
async function assertAssessmentOwner(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  ownerUserId: string,
  assessmentId: string,
): Promise<{ patientId: string } | { error: string }> {
  const { data: row } = await supabase
    .from("patient_nutrition_assessments")
    .select("id, patient_id, patients!inner(client_id, clients!inner(owner_user_id))")
    .eq("id", assessmentId)
    .maybeSingle();

  if (!row) return { error: "Avaliação não encontrada." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owner = (row as any).patients?.clients?.owner_user_id;
  if (owner !== ownerUserId) return { error: "Sem permissão para esta avaliação." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { patientId: (row as any).patient_id as string };
}

export async function deleteNutritionAssessmentAction(
  _prev: NutritionAssessmentFormResult | undefined,
  formData: FormData,
): Promise<NutritionAssessmentFormResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const assessmentId = String(formData.get("assessment_id") ?? "").trim();
  if (!assessmentId) return { ok: false, error: "ID em falta." };

  const check = await assertAssessmentOwner(supabase, workspaceOwnerId, assessmentId);
  if ("error" in check) return { ok: false, error: check.error };

  const { error } = await supabase
    .from("patient_nutrition_assessments")
    .delete()
    .eq("id", assessmentId);

  if (error) return { ok: false, error: "Não foi possível eliminar." };

  revalidatePath(`/pacientes/${check.patientId}/editar`);
  revalidatePath(`/pacientes/${check.patientId}/historico`);
  return { ok: true };
}

export async function updateNutritionAssessmentAction(
  _prev: NutritionAssessmentFormResult | undefined,
  formData: FormData,
): Promise<NutritionAssessmentFormResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const assessmentId = String(formData.get("assessment_id") ?? "").trim();
  if (!assessmentId) return { ok: false, error: "ID em falta." };

  const check = await assertAssessmentOwner(supabase, workspaceOwnerId, assessmentId);
  if ("error" in check) return { ok: false, error: check.error };

  const height_cm    = parseOptDecimal(String(formData.get("height_cm") ?? ""));
  const weight_kg    = parseOptDecimal(String(formData.get("weight_kg") ?? ""));
  const waist_cm     = parseOptDecimal(String(formData.get("waist_cm") ?? ""));
  const activity_level = parseActivityLevel(formData.get("activity_level"));
  const diet_notes   = trimText(String(formData.get("diet_notes") ?? ""));
  const clinical_notes = trimText(String(formData.get("clinical_notes") ?? ""));
  const goals        = trimText(String(formData.get("goals") ?? ""));

  const { error } = await supabase
    .from("patient_nutrition_assessments")
    .update({ height_cm, weight_kg, waist_cm, activity_level, diet_notes, clinical_notes, goals })
    .eq("id", assessmentId);

  if (error) return { ok: false, error: "Não foi possível salvar as alterações." };

  revalidatePath(`/pacientes/${check.patientId}/editar`);
  revalidatePath(`/pacientes/${check.patientId}/historico`);
  return { ok: true };
}
