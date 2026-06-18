"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ConsolidatedAssessmentKind,
  ConsolidatedNutritionEvent,
} from "@/lib/types/patient-history";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";
import type { GeriatricAssessmentRow } from "@/lib/types/geriatric-assessments";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import {
  buildAnthroAssessmentSummaryLine,
  buildAssessmentSummaryLine,
  buildChildAssessmentSummaryLine,
} from "@/lib/utils/nutrition-assessment-display";
import { onlyDigits } from "@/lib/validators/br-document";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

type PatientEmbed = {
  id: string;
  establishment_id: string | null;
  clients: { legal_name: string } | null;
  establishments: { name: string } | null;
};

type WithPatientEmbed = {
  patients: PatientEmbed | PatientEmbed[] | null;
};

const ASSESSMENT_KIND_LABELS: Record<ConsolidatedAssessmentKind, string> = {
  general: "Avaliação geral",
  adult: "Adultos",
  geriatric: "Idosos",
  child: "Infantil",
};

const PATIENT_EMBED_SELECT = `
  patients (
    id,
    establishment_id,
    clients ( legal_name ),
    establishments ( name )
  )
`;

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

function originLabelFromRow(row: WithPatientEmbed): string {
  const p = unwrapPatient(row.patients);
  return p ? originLabelFromPatient(p) : "Contexto desconhecido";
}

function sortEventsDesc(events: ConsolidatedNutritionEvent[]): ConsolidatedNutritionEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
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
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: anchor, error: anchorErr } = await supabase
    .from("patients")
    .select("id, full_name, document_id, client_id, user_id")
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

  if (anchor.user_id !== workspaceOwnerId) {
    return {
      patientFullName: null,
      mergeByDocument: false,
      linkedPatientCount: 0,
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
      .eq("user_id", workspaceOwnerId)
      .eq("document_id", docDigits);

    patientIds = (siblings ?? []).map((r) => r.id);
    if (!patientIds.includes(patientId)) {
      patientIds = [...patientIds, patientId];
    }
  } else {
    patientIds = [patientId];
  }

  const mergeByDocument = docDigits.length > 0 && patientIds.length > 1;

  const [
    { data: generalRows },
    { data: adultRows },
    { data: geriatricRows },
    { data: childRows },
  ] = await Promise.all([
    supabase
      .from("patient_nutrition_assessments")
      .select(`*, ${PATIENT_EMBED_SELECT}`)
      .in("patient_id", patientIds),
    supabase
      .from("patient_adult_nutrition_assessments")
      .select(`*, ${PATIENT_EMBED_SELECT}`)
      .in("patient_id", patientIds),
    supabase
      .from("patient_geriatric_assessments")
      .select(`*, ${PATIENT_EMBED_SELECT}`)
      .in("patient_id", patientIds),
    supabase
      .from("patient_child_assessments")
      .select(`*, ${PATIENT_EMBED_SELECT}`)
      .in("patient_id", patientIds),
  ]);

  const events: ConsolidatedNutritionEvent[] = [];

  for (const row of (generalRows ?? []) as Array<
    NutritionAssessmentRow & WithPatientEmbed
  >) {
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

    events.push({
      id: row.id,
      recorded_at: row.recorded_at,
      origin_label: originLabelFromRow(row),
      assessment_kind: "general",
      assessment_kind_label: ASSESSMENT_KIND_LABELS.general,
      summary_line: buildAssessmentSummaryLine(assessment),
      diet_notes: row.diet_notes,
      clinical_notes: row.clinical_notes,
      goals: row.goals,
      nutritional_diagnosis: null,
    });
  }

  for (const row of (adultRows ?? []) as Array<
    GeriatricAssessmentRow & WithPatientEmbed
  >) {
    events.push({
      id: row.id,
      recorded_at: row.recorded_at,
      origin_label: originLabelFromRow(row),
      assessment_kind: "adult",
      assessment_kind_label: ASSESSMENT_KIND_LABELS.adult,
      summary_line: buildAnthroAssessmentSummaryLine(row),
      diet_notes: null,
      clinical_notes: row.clinical_notes,
      goals: null,
      nutritional_diagnosis: row.nutritional_diagnosis,
    });
  }

  for (const row of (geriatricRows ?? []) as Array<
    GeriatricAssessmentRow & WithPatientEmbed
  >) {
    events.push({
      id: row.id,
      recorded_at: row.recorded_at,
      origin_label: originLabelFromRow(row),
      assessment_kind: "geriatric",
      assessment_kind_label: ASSESSMENT_KIND_LABELS.geriatric,
      summary_line: buildAnthroAssessmentSummaryLine(row),
      diet_notes: null,
      clinical_notes: row.clinical_notes,
      goals: null,
      nutritional_diagnosis: row.nutritional_diagnosis,
    });
  }

  for (const row of (childRows ?? []) as Array<
    ChildAssessmentRow & WithPatientEmbed
  >) {
    events.push({
      id: row.id,
      recorded_at: row.recorded_at,
      origin_label: originLabelFromRow(row),
      assessment_kind: "child",
      assessment_kind_label: ASSESSMENT_KIND_LABELS.child,
      summary_line: buildChildAssessmentSummaryLine(row),
      diet_notes: null,
      clinical_notes: row.clinical_notes,
      goals: null,
      nutritional_diagnosis: null,
    });
  }

  return {
    patientFullName: anchor.full_name,
    mergeByDocument,
    linkedPatientCount: patientIds.length,
    documentOnFile,
    events: sortEventsDesc(events),
  };
}
