"use server";

// Importação em massa de avaliações nutricionais infantis (ex.: pesagem de turma escolar).
// Cada linha: casa um paciente existente por nome + nascimento (no tenant) ou cria um novo;
// em seguida recalcula a avaliação no servidor (IMC + percentis) a partir de peso/estatura/
// idade/sexo, exatamente como o formulário manual — nunca confia em percentil/diagnóstico
// vindos do arquivo. Segurança: auth obrigatório; tenant sempre do workspace do JWT.

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { assessChild } from "@/lib/nutrition/child/assess";
import { ageInMonths } from "@/lib/nutrition/child/age";
import { matchChildKey } from "@/lib/import/child-assessment-match";
import type { ChildResultEntry } from "@/lib/types/child-assessments";
import type { ChildAssessmentImportResult } from "@/lib/types/child-assessment-import";
import {
  MAX_CHILD_ASSESSMENT_IMPORT_ROWS,
  parseImportChildAssessmentsPayload,
} from "@/lib/validators/import-child-assessment-rows";

/** AAAA-MM-DD → DD/MM/AAAA, para texto legível no histórico. */
function isoDateToBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmt1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

const IMPORT_SOURCE_LABEL = "Importado via upload de arquivo em massa (avaliação infantil)";

/** Nota rastreável: origem (upload), dados da linha e data da pesagem como referência. */
function buildImportClinicalNotes(
  row: { weight_kg: number; height_cm: number; recorded_at: string; clinical_notes: string | null },
): string {
  const base =
    `${IMPORT_SOURCE_LABEL}. Peso: ${fmt1(row.weight_kg)} kg · Estatura: ${fmt1(row.height_cm)} cm ` +
    `· Data da pesagem (referência): ${isoDateToBR(row.recorded_at)}.`;
  return row.clinical_notes ? `${base} ${row.clinical_notes}` : base;
}

export async function importChildAssessmentsAction(
  rows: unknown,
  link: unknown,
): Promise<ChildAssessmentImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const parsed = parseImportChildAssessmentsPayload(rows, link);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // ── Resolver vínculo (cliente/estabelecimento) para o lote inteiro ─────────
  let clientId: string | null = null;
  let establishmentId: string | null = null;

  if (parsed.link.kind === "linked") {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, kind, owner_user_id")
      .eq("id", parsed.link.clientId)
      .maybeSingle();

    if (!clientRow || clientRow.owner_user_id !== workspaceOwnerId) {
      return { ok: false, error: "Cliente não encontrado ou sem permissão de acesso." };
    }

    if (clientRow.kind === "pj") {
      if (!parsed.link.establishmentId) {
        return {
          ok: false,
          error: "Cliente PJ requer um estabelecimento. Informe o ID do estabelecimento.",
        };
      }
      const { data: est } = await supabase
        .from("establishments")
        .select("id, client_id")
        .eq("id", parsed.link.establishmentId)
        .maybeSingle();
      if (!est || est.client_id !== parsed.link.clientId) {
        return { ok: false, error: "Estabelecimento inválido para este cliente." };
      }
      establishmentId = est.id as string;
    } else if (parsed.link.establishmentId) {
      return { ok: false, error: "Clientes PF não podem ter estabelecimento." };
    }

    clientId = clientRow.id as string;
  }

  let patientsCreated = 0;
  let patientsMatched = 0;
  let assessmentsImported = 0;
  let skipped = 0;
  const duplicateRows: string[] = [];

  // ── Bloqueia duplicados dentro do próprio arquivo (mesmo nome + nascimento) ─
  // Defesa em profundidade: o wizard já filtra isso na pré-visualização (etapa 3)
  // e mostra quais linhas são duplicadas, mas a Server Action não confia no cliente.
  const nameBirthCounts = new Map<string, number>();
  for (const row of parsed.rows) {
    const key = matchChildKey(row.full_name, row.birth_date);
    nameBirthCounts.set(key, (nameBirthCounts.get(key) ?? 0) + 1);
  }
  const rowsToProcess = parsed.rows.filter((row) => {
    const key = matchChildKey(row.full_name, row.birth_date);
    if ((nameBirthCounts.get(key) ?? 0) > 1) {
      skipped += 1;
      duplicateRows.push(`${row.full_name} (${isoDateToBR(row.birth_date)})`);
      return false;
    }
    return true;
  });

  if (duplicateRows.length > 0) {
    console.warn(
      "[import:child-assessments] linhas duplicadas ignoradas (mesmo nome + nascimento):",
      duplicateRows.join(", "),
    );
  }

  // ── Pré-carrega pacientes existentes do tenant para casar por nome + nascimento
  //    sem um round-trip por linha (mantém a importação dentro do NFR de 500 linhas/30s) ──
  const { data: existingPatients } = await supabase
    .from("patients")
    .select("id, full_name, birth_date")
    .eq("user_id", workspaceOwnerId);

  const patientIndex = new Map<string, string>();
  for (const p of existingPatients ?? []) {
    if (!p.full_name || !p.birth_date) continue;
    patientIndex.set(matchChildKey(p.full_name as string, p.birth_date as string), p.id as string);
  }

  // ── Pré-carrega as datas de avaliação já registradas para esses pacientes ──
  // Bloqueia reenvio da mesma pesagem (mesmo paciente + mesma data): não cria
  // paciente novo, não reaproveita cadastro, não grava nada para essa linha.
  const existingPatientIds = [...patientIndex.values()];
  const existingAssessmentDateKeys = new Set<string>();
  if (existingPatientIds.length > 0) {
    const { data: existingAssessments } = await supabase
      .from("patient_child_assessments")
      .select("patient_id, recorded_at")
      .in("patient_id", existingPatientIds);

    for (const a of existingAssessments ?? []) {
      const dateOnly = String(a.recorded_at).slice(0, 10);
      existingAssessmentDateKeys.add(`${a.patient_id}|${dateOnly}`);
    }
  }

  for (const row of rowsToProcess) {
    const key = matchChildKey(row.full_name, row.birth_date);
    let patientId = patientIndex.get(key);

    if (patientId && existingAssessmentDateKeys.has(`${patientId}|${row.recorded_at}`)) {
      // Pesagem duplicada: paciente já existe e já tem avaliação nesta data exata.
      skipped += 1;
      continue;
    }

    if (patientId) {
      patientsMatched += 1;
    } else {
      const { data: created, error: patientError } = await supabase
        .from("patients")
        .insert({
          user_id: workspaceOwnerId,
          client_id: clientId,
          establishment_id: establishmentId,
          full_name: row.full_name,
          birth_date: row.birth_date,
          sex: row.sex,
        })
        .select("id")
        .single();

      if (patientError || !created) {
        console.error("[import:child-assessments] erro ao criar paciente:", patientError?.code);
        skipped += 1;
        continue;
      }

      patientId = created.id as string;
      patientIndex.set(key, patientId);
      patientsCreated += 1;
    }

    const months = ageInMonths(new Date(row.birth_date), new Date(row.recorded_at));
    if (months == null || months > 240) {
      skipped += 1;
      continue;
    }

    // Recalcula no servidor — nunca confia em IMC/percentil/diagnóstico do arquivo.
    const assessment = assessChild({
      sex: row.sex,
      ageMonths: months,
      weightKg: row.weight_kg,
      heightCm: row.height_cm,
      method: "percentile",
      armCircumferenceCm: null,
      tricepsSkinfoldMm: null,
      subscapularSkinfoldMm: null,
      headCircumferenceCm: null,
    });
    const results: ChildResultEntry[] = assessment.indicators;
    const recordedAtTimestamp = `${row.recorded_at}T12:00:00`;
    const importClinicalNotes = buildImportClinicalNotes(row);

    const { error: assessmentError } = await supabase.from("patient_child_assessments").insert({
      patient_id: patientId,
      recorded_at: recordedAtTimestamp,
      sex: row.sex,
      age_months: months,
      weight_kg: row.weight_kg,
      height_cm: row.height_cm,
      measured_lying: null,
      classification_method: "percentile",
      bmi: assessment.bmi,
      results,
      clinical_notes: importClinicalNotes,
    });

    if (assessmentError) {
      console.error(
        "[import:child-assessments] erro ao gravar avaliação:",
        assessmentError.code,
      );
      skipped += 1;
      continue;
    }

    assessmentsImported += 1;

    // Também grava em "Informações complementares" (patient_nutrition_assessments) —
    // é essa tabela que alimenta os indicadores de Peso/Altura/IMC e o histórico geral
    // na tela inicial do paciente. Sem isto, o registro só aparecia na aba de avaliação
    // especializada. Melhor esforço: uma falha aqui não desfaz a avaliação já gravada.
    const { error: generalError } = await supabase.from("patient_nutrition_assessments").insert({
      patient_id: patientId,
      recorded_at: recordedAtTimestamp,
      height_cm: row.height_cm,
      weight_kg: row.weight_kg,
      clinical_notes: importClinicalNotes,
    });

    if (generalError) {
      console.error(
        "[import:child-assessments] erro ao gravar indicador geral:",
        generalError.code,
      );
    }
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const overLimitSkipped =
    rowCount > MAX_CHILD_ASSESSMENT_IMPORT_ROWS ? rowCount - MAX_CHILD_ASSESSMENT_IMPORT_ROWS : 0;

  return {
    ok: true,
    patientsCreated,
    patientsMatched,
    assessmentsImported,
    skipped: skipped + overLimitSkipped,
  };
}
