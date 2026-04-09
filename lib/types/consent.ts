/**
 * Types para Consentimentos Digitais (Story 11.3)
 * LGPD Art. 7 — Consentimento como base legal de tratamento
 */

/**
 * Tipos de consentimento suportados
 */
export type ConsentType = 'uso_dados' | 'compartilhamento_externo' | 'pesquisa' | 'marketing';

/**
 * Status do consentimento
 */
export type ConsentStatus = 'active' | 'revogado';

/**
 * Registo de consentimento do banco de dados
 */
export type ConsentRecord = {
  id: string;
  user_id: string;
  patient_id: string;
  consent_type: ConsentType;
  status: ConsentStatus;
  is_parental_consent: boolean;
  parental_consent_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  revocation_reason: string | null;
  revoked_at: string | null;
  document_reference: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Dados necessários para registar um novo consentimento
 */
export type RecordConsentInput = {
  patientId: string;
  consentType: ConsentType;
  isParentalConsent?: boolean;
  parentalConsentName?: string;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Dados necessários para revogar um consentimento
 */
export type RevokeConsentInput = {
  consentRecordId: string;
  revocationReason: string;
};

/**
 * Resposta ao registar consentimento (sucesso/erro)
 */
export type ConsentResponse = {
  success: boolean;
  consentId?: string;
  error?: string;
};

/**
 * Sumário de consentimentos ativos de um paciente
 */
export type PatientConsentSummary = {
  patientId: string;
  consentTypes: ConsentType[];
  hasParentalConsent: boolean;
  lastConsentDate: string | null;
};

/**
 * Labels legíveis para tipos de consentimento (português)
 */
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  uso_dados: 'Uso de Dados Pessoais',
  compartilhamento_externo: 'Compartilhamento com Terceiros',
  pesquisa: 'Participação em Pesquisa',
  marketing: 'Comunicações de Marketing',
};

/**
 * Descrições para tipos de consentimento (português)
 */
export const CONSENT_TYPE_DESCRIPTIONS: Record<ConsentType, string> = {
  uso_dados:
    'Autoriza o tratamento e armazenamento de dados pessoais para fins de atendimento e gestão clínica.',
  compartilhamento_externo:
    'Autoriza o compartilhamento de dados com profissionais ou instituições externas conforme necessário.',
  pesquisa:
    'Autoriza o uso de dados de forma anonimizada para pesquisa científica e melhoria do serviço.',
  marketing:
    'Autoriza o envio de comunicações sobre novos serviços, promoções e atualizações relevantes.',
};
