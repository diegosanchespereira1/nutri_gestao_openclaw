export type ProfessionalArea = "nutrition" | "other";

export type TeamJobRole =
  | "nutricionista"
  | "nutricionista_estagiario"
  | "tecnico_nutricao"
  | "auxiliar"
  | "administrativo"
  | "gestao"
  | "outro";

export type TeamMemberRow = {
  id: string;
  owner_user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  professional_area: ProfessionalArea;
  job_role: TeamJobRole;
  crn: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
