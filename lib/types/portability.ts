/**
 * Types para Portabilidade de Dados — Data Portability (Story 11.5)
 * LGPD Art. 20 — Direito de Portabilidade do Titular
 */

/**
 * Metadados do relatório de portabilidade
 */
export type PortabilityMetadata = {
  generated_at: string;
  generated_by: string;
  version: string;
  lgpd_article: string;
};

/**
 * Perfil do profissional
 */
export type PortabilityProfessionalProfile = {
  id: string;
  full_name: string;
  email: string;
  crn?: string;
  phone?: string;
  subscription_plan?: string;
  is_active: boolean;
  created_at: string;
};

/**
 * Cliente (PF ou PJ)
 */
export type PortabilityClient = {
  id: string;
  name: string;
  type: 'PF' | 'PJ';
  document: string; // mascarado
  email?: string;
  phone?: string;
  created_at: string;
};

/**
 * Estabelecimento
 */
export type PortabilityEstablishment = {
  id: string;
  name: string;
  type: string;
  client_id: string;
  address?: string;
  city?: string;
  state?: string;
  created_at: string;
};

/**
 * Paciente (referência apenas)
 */
export type PortabilityPatientReference = {
  id: string;
  full_name: string;
  linked_to: string; // client_id ou establishment_id
  created_at: string;
};

/**
 * Consentimento (resumido)
 */
export type PortabilityConsentEntry = {
  id: string;
  patient_id: string;
  consent_type: string;
  status: 'active' | 'revogado';
  created_at: string;
};

/**
 * Configurações do profissional
 */
export type PortabilitySettings = {
  theme?: string;
  language?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
};

/**
 * Seção de dados compilados
 */
export type PortabilityDataSection<T> = {
  count: number;
  data: T[];
};

/**
 * Relatório completo de portabilidade
 */
export type PortabilityCompleteReport = {
  metadata: PortabilityMetadata;
  professional: PortabilityProfessionalProfile;
  clients: PortabilityDataSection<PortabilityClient>;
  establishments: PortabilityDataSection<PortabilityEstablishment>;
  patients: PortabilityDataSection<PortabilityPatientReference>;
  consents: PortabilityDataSection<PortabilityConsentEntry>;
  settings: PortabilitySettings;
};

/**
 * Formatos de exportação suportados
 */
export type PortabilityExportFormat = 'json' | 'csv';

/**
 * Resposta de geração de portabilidade
 */
export type PortabilityGenerationResponse = {
  success: boolean;
  report?: PortabilityCompleteReport;
  error?: string;
};

/**
 * Resultado de exportação
 */
export type PortabilityExportResult = {
  success: boolean;
  content?: string;
  filename?: string;
  mimeType?: string;
  error?: string;
};
