"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { assessChild } from "@/lib/nutrition/child/assess";
import { ageInMonthsFromISO } from "@/lib/nutrition/child/age";
import type {
  ChildSex,
  ClassificationMethod,
} from "@/lib/nutrition/child/types";
import type {
  ChildAssessmentRow,
  ChildResultEntry,
} from "@/lib/types/child-assessments";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type ChildAssessmentFormResult =
  | { ok: true }
  | { ok: false; error: string };

function parseDec(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseSex(raw: FormDataEntryValue | null): ChildSex | null {
  const s = String(raw ?? "").trim();
  return s === "female" || s === "male" ? s : null;
}

function parseMethod(raw: FormDataEntryValue | null): ClassificationMethod {
  const s = String(raw ?? "").trim();
  return s === "zscore" ? "zscore" : "percentile";
}

export async function loadChildAssessmentsForPatient(
  patientId: string,
): Promise<{ rows: ChildAssessmentRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("patient_child_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as ChildAssessmentRow[] };
}

export async function createChildAssessmentAction(
  _prev: ChildAssessmentFormResult | undefined,
  formData: FormData,
): Promise<ChildAssessmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const patientId = String(formData.get("patient_id") ?? "").trim();
  if (!patientId) return { ok: false, error: "Paciente em falta." };

  const { data: patient } = await supabase
    .from("patients")
    .select("id, user_id")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient || patient.user_id !== workspaceOwnerId) {
    return { ok: false, error: "Paciente não encontrado." };
  }

  const sex = parseSex(formData.get("sex"));
  if (!sex) return { ok: false, error: "Selecione o sexo da criança." };

  const method = parseMethod(formData.get("classification_method"));

  // Data da avaliação (default agora). Usada também para calcular a idade.
  const recordedRaw = String(formData.get("recorded_at") ?? "").trim();
  const recordedAt = recordedRaw ? `${recordedRaw}T12:00:00` : new Date().toISOString();

  // Idade em meses: preferir cálculo a partir da data de nascimento.
  const birthISO = String(formData.get("birth_date") ?? "").trim() || null;
  const ageFromBirth = ageInMonthsFromISO(birthISO, recordedAt);
  const ageFromField = parseDec(formData.get("age_months"));
  const ageMonths =
    ageFromBirth ?? (ageFromField != null ? Math.round(ageFromField) : null);

  if (ageMonths == null || ageMonths < 0 || ageMonths > 240) {
    return {
      ok: false,
      error: "Informe a data de nascimento ou a idade (0–20 anos).",
    };
  }

  const weightKg = parseDec(formData.get("weight_kg"));
  const heightCm = parseDec(formData.get("height_cm"));
  if (weightKg == null && heightCm == null) {
    return { ok: false, error: "Informe pelo menos o peso ou a estatura." };
  }

  const measuredLyingRaw = String(formData.get("measured_lying") ?? "").trim();
  const measuredLying =
    measuredLyingRaw === "" ? null : measuredLyingRaw === "true";

  const clinicalNotes =
    String(formData.get("clinical_notes") ?? "").trim() || null;

  // Recalcula no servidor (não confia em valores vindos do cliente).
  const assessment = assessChild({ sex, ageMonths, weightKg, heightCm, method });
  const results: ChildResultEntry[] = assessment.indicators;

  const { error } = await supabase.from("patient_child_assessments").insert({
    patient_id: patientId,
    recorded_at: recordedAt,
    sex,
    age_months: ageMonths,
    weight_kg: weightKg,
    height_cm: heightCm,
    measured_lying: measuredLying,
    classification_method: method,
    bmi: assessment.bmi,
    results,
    clinical_notes: clinicalNotes,
  });

  if (error) {
    console.error("[child-assessments]", { code: error.code });
    const detail =
      process.env.NODE_ENV === "development"
        ? ` [${error.code ?? "?"}: ${error.message}]`
        : "";
    return { ok: false, error: `Não foi possível salvar a avaliação.${detail}` };
  }

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath(`/pacientes/${patientId}/editar`);
  redirect(`/pacientes/${patientId}?avaliacao=ok`);
}

async function assertChildOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerUserId: string,
  assessmentId: string,
): Promise<{ patientId: string } | { error: string }> {
  const { data: row } = await supabase
    .from("patient_child_assessments")
    .select("id, patient_id, patients!inner(user_id)")
    .eq("id", assessmentId)
    .maybeSingle();

  if (!row) return { error: "Avaliação não encontrada." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owner = (row as any).patients?.user_id;
  if (owner !== ownerUserId) return { error: "Sem permissão para esta avaliação." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { patientId: (row as any).patient_id as string };
}

export async function deleteChildAssessmentAction(
  _prev: ChildAssessmentFormResult | undefined,
  formData: FormData,
): Promise<ChildAssessmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const assessmentId = String(formData.get("assessment_id") ?? "").trim();
  if (!assessmentId) return { ok: false, error: "ID em falta." };

  const check = await assertChildOwner(supabase, workspaceOwnerId, assessmentId);
  if ("error" in check) return { ok: false, error: check.error };

  const { error } = await supabase
    .from("patient_child_assessments")
    .delete()
    .eq("id", assessmentId);

  if (error) return { ok: false, error: "Não foi possível eliminar." };

  revalidatePath(`/pacientes/${check.patientId}`);
  return { ok: true };
}
