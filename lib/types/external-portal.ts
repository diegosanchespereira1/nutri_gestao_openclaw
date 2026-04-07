export type ExternalPortalUserRole = "viewer" | "guardian";

export type ExternalPortalUser = {
  id: string;
  owner_user_id: string;
  email: string;
  full_name: string;
  role: ExternalPortalUserRole;
  patient_id: string | null;
  is_active: boolean;
  last_access_at: string | null;
  created_at: string;
};

export type ExternalAccessPermissions = {
  id: string;
  owner_user_id: string;
  external_user_id: string;
  patient_id: string;
  can_view_reports: boolean;
  can_view_measurements: boolean;
  can_view_exams: boolean;
  can_view_nutrition_plan: boolean;
};

export type GuardianRelationship = "parent" | "legal_guardian" | "other";

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> =
  {
    parent: "Pai/Mãe",
    legal_guardian: "Responsável legal",
    other: "Outro",
  };

export type PatientParentalConsent = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  guardian_full_name: string;
  guardian_document_id: string | null;
  guardian_relationship: GuardianRelationship;
  guardian_email: string | null;
  consented_at: string;
  consent_text: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
};

export const LGPD_CONSENT_TEXT_TEMPLATE = `Declaro que sou responsável legal pelo paciente menor de idade e autorizo o uso dos dados de saúde coletados pelo profissional nutricionista para fins de acompanhamento nutricional, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), Art. 14, que exige consentimento específico do responsável legal para tratamento de dados pessoais de crianças e adolescentes.`;
