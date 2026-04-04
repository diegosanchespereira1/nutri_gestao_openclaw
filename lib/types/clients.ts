import type { ClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type { PatientSex } from "@/lib/types/patients";

export type ClientKind = "pf" | "pj";

export type { ClientBusinessSegment };

/** Estado comercial do contrato (PJ; PF mantém-se sempre ativo na prática). */
export type ClientLifecycleStatus = "ativo" | "inativo" | "finalizado";

export type ClientSocialLinks = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  other?: string;
};

export type ClientRow = {
  id: string;
  owner_user_id: string;
  kind: ClientKind;
  legal_name: string;
  trade_name: string | null;
  document_id: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lifecycle_status: ClientLifecycleStatus;
  /** Só PJ: padaria, mercado, escola, etc. */
  business_segment: ClientBusinessSegment | null;
  activated_at: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  sanitary_license: string | null;
  website_url: string | null;
  social_links: ClientSocialLinks;
  logo_storage_path: string | null;
  legal_rep_full_name: string | null;
  legal_rep_document_id: string | null;
  legal_rep_role: string | null;
  legal_rep_email: string | null;
  legal_rep_phone: string | null;
  technical_rep_full_name: string | null;
  technical_rep_professional_id: string | null;
  technical_rep_email: string | null;
  technical_rep_phone: string | null;
  /** Nome da pessoa atendida se diferente do titular (`legal_name`). Só PF. */
  attended_full_name: string | null;
  birth_date: string | null;
  sex: PatientSex | null;
  dietary_restrictions: string | null;
  chronic_medications: string | null;
  guardian_full_name: string | null;
  guardian_document_id: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  created_at: string;
  updated_at: string;
};
