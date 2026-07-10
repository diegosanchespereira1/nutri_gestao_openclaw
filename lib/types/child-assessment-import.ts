// Importação em massa de avaliações nutricionais infantis (ex.: pesagem de turma escolar).
// Cada linha do arquivo cria/casa o cadastro do paciente (por nome + nascimento) e grava
// a avaliação — os percentis e o diagnóstico são sempre recalculados no servidor a partir
// de peso/estatura/idade/sexo (mesma lógica do formulário manual), nunca lidos do arquivo.
// Ver lib/actions/import-child-assessments.ts.

import type { ChildSex } from "@/lib/nutrition/child/types";
import type { FieldDef } from "@/lib/types/import";

/** Vínculo do lote de importação inteiro (todas as linhas do arquivo).
 *  schoolGradeId é opcional — só faz sentido quando o cliente é uma escola
 *  com séries cadastradas (aplica a mesma série a todas as linhas do lote). */
export type ChildAssessmentImportLink =
  | { kind: "independent" }
  | {
      kind: "linked";
      clientId: string;
      establishmentId: string | null;
      schoolGradeId: string | null;
    };

/** Linha validada, pronta para ser enviada à Server Action. */
export type ChildAssessmentImportRow = {
  full_name: string;
  /** AAAA-MM-DD */
  birth_date: string;
  /** AAAA-MM-DD — data da pesagem/avaliação. */
  recorded_at: string;
  sex: ChildSex;
  weight_kg: number;
  /** Sempre normalizado para centímetros antes de chegar aqui. */
  height_cm: number;
  clinical_notes: string | null;
};

export const CHILD_ASSESSMENT_FIELDS: FieldDef[] = [
  { key: "full_name", label: "Nome completo", required: true },
  { key: "birth_date", label: "Data de nascimento (AAAA-MM-DD ou DD/MM/AAAA)", required: true },
  { key: "recorded_at", label: "Data da pesagem/avaliação (AAAA-MM-DD ou DD/MM/AAAA)", required: true },
  { key: "sex", label: "Sexo (F/Feminino ou M/Masculino)", required: true },
  { key: "weight_kg", label: "Peso (kg)", required: true },
  { key: "height_cm", label: "Estatura (cm ou m — convertido automaticamente)", required: true },
  { key: "clinical_notes", label: "Observações (opcional)", required: false },
];

export type ChildAssessmentImportResult =
  | {
      ok: true;
      patientsCreated: number;
      patientsMatched: number;
      assessmentsImported: number;
      skipped: number;
    }
  | { ok: false; error: string };
