// Séries/turmas cadastradas por um cliente PJ (tipicamente categoria "escola").
// Ver supabase/migrations/20260830130000_client_school_grades.sql.

export type ClientSchoolGradeRow = {
  id: string;
  client_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

/** Formato leve usado nos seletores (formulário do paciente, wizard de upload). */
export type ClientSchoolGradeOption = {
  id: string;
  name: string;
};
