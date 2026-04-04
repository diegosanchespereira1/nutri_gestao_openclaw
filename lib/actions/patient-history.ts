"use server";

import { createClient } from "@/lib/supabase/server";
import type { ConsolidatedNutritionEvent } from "@/lib/types/patient-history";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import { buildAssessmentSummaryLine } from "@/lib/utils/nutrition-assessment-display";
import { onlyDigits } from "@/lib/validators/br-document";

type PatientEmbed = {
  id: string;
  establishment_id: string | null;
  clients: { legal_name: string } | null;
  establishments: { name: string } | null;
};

type RawAssessmentRow = NutritionAssessmentRow & {
  patients: PatientEmbed | PatientEmbed[] | null;
};

function unwrapPatient(
  p: PatientEmbed | PatientEmbed[] | null,
): PatientEmbed | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function originLabelFromPatient(p: PatientEmbed): string {
  const clientName = p.clients?.legal_name ?? "Cliente";
  if (p.establishment_id && p.establishments?.name) {
    return `${p.establishments.name} · ${clientName}`;
  }
  return `Particular · ${clientName}`;
}

export async function loadConsolidatedNutritionHistory(patientId: string): Promise<{
  patientFullName: string | null;
  mergeByDocument: boolean;
  linkedPatientCount: number;
  documentOnFile: boolean;
  events: ConsolidatedNutritionEvent[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      patientFullName: null,
      mergeByDocument: false,
      linkedPatientCount: 0,
      documentOnFile: false,
      events: [],
    };
  }

  const { data: anchor, error: anchorErr } = await supabase
    .from("patients")
    .select("id, full_name, document_id, client_id")
    .eq("id", patientId)
    .maybeSingle();

  if (anchorErr || !anchor) {
    return {
      patientFullName: null,
      mergeByDocument: false,
      linkedPatientCount: 0,
      documentOnFile: false,
      events: [],
    };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", anchor.client_id)
    .maybeSingle();

  if (!clientRow || clientRow.owner_user_id !== user.id) {
    return {
      patientFullName: null,
      mergeByDocument: false,
      linkedPatientCount: 0,
      documentOnFile: false,
      events: [],
    };
  }

  const { data: myClients } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id);

  const clientIds = (myClients ?? []).map((c) => c.id);
  if (clientIds.length === 0) {
    return {
      patientFullName: anchor.full_name,
      mergeByDocument: false,
      linkedPatientCount: 1,
      documentOnFile: false,
      events: [],
    };
  }

  const docDigits = onlyDigits(anchor.document_id ?? "");
  const documentOnFile = docDigits.length > 0;
  let patientIds: string[];

  if (docDigits.length > 0) {
    const { data: siblings } = await supabase
      .from("patients")
      .select("id")
      .in("client_id", clientIds)
      .eq("document_id", docDigits);

    patientIds = (siblings ?? []).map((r) => r.id);
    if (!patientIds.includes(patientId)) {
      patientIds = [...patientIds, patientId];
    }
  } else {
    patientIds = [patientId];
  }

  const mergeByDocument = docDigits.length > 0 && patientIds.length > 1;

  const { data: rawRows, error: listErr } = await supabase
    .from("patient_nutrition_assessments")
    .select(
      `
      *,
      patients (
        id,
        establishment_id,
        clients ( legal_name ),
        establishments ( name )
      )
    `,
    )
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });

  if (listErr || !rawRows) {
    return {
      patientFullName: anchor.full_name,
      mergeByDocument,
      linkedPatientCount: patientIds.length,
      documentOnFile,
      events: [],
    };
  }

  const events: ConsolidatedNutritionEvent[] = (
    rawRows as RawAssessmentRow[]
  ).map((row) => {
    const p = unwrapPatient(row.patients);
    const origin_label = p ? originLabelFromPatient(p) : "Contexto desconhecido";
    const assessment: NutritionAssessmentRow = {
      id: row.id,
      patient_id: row.patient_id,
      recorded_at: row.recorded_at,
      height_cm: row.height_cm,
      weight_kg: row.weight_kg,
      waist_cm: row.waist_cm,
      activity_level: row.activity_level,
      diet_notes: row.diet_notes,
      clinical_notes: row.clinical_notes,
      goals: row.goals,
    };
    return {
      id: row.id,
      recorded_at: row.recorded_at,
      origin_label,
      summary_line: buildAssessmentSummaryLine(assessment),
      diet_notes: row.diet_notes,
      clinical_notes: row.clinical_notes,
      goals: row.goals,
    };
  });

  return {
    patientFullName: anchor.full_name,
    mergeByDocument,
    linkedPatientCount: patientIds.length,
    documentOnFile,
    events,
  };
}
