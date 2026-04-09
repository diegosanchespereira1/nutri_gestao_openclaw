/**
 * Types para Relatório DSAR — Data Subject Access Request (Story 11.4)
 * LGPD Art. 18 — Direito de Acesso do Titular
 */

import type { AuditLogRow } from './audit';
import type { ConsentRecord } from './consent';

/**
 * Metadados do relatório DSAR
 */
export type DsarMetadata = {
  generated_at: string;
  generated_by: string;
  data_integrity_hash: string;
  version: string;
};

/**
 * Secção de perfil do paciente (dados pessoais)
 */
export type DsarPatientProfile = {
  id: string;
  full_name: string;
  document_id: string; // mascarado: ***.***.***.XX
  date_of_birth: string; // mascarado: YYYY-**-**
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

/**
 * Avaliação nutricional (resumida)
 */
export type DsarAssessment = {
  id: string;
  assessment_date: string;
  assessment_type?: string;
  data: Record<string, unknown>;
  created_at: string;
};

/**
 * Visita técnica (resumida)
 */
export type DsarVisit = {
  id: string;
  visit_date: string;
  establishment?: string;
  checklist_name?: string;
  status?: string;
  created_at: string;
};

/**
 * Entrada de histórico de acesso (auditoria)
 */
export type DsarAccessEntry = {
  timestamp: string;
  user_id: string;
  user_email: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  table_name: string;
  data_changed?: Record<string, unknown> | null;
};

/**
 * Consentimento registado
 */
export type DsarConsentEntry = {
  id: string;
  consent_type: string;
  status: 'active' | 'revogado';
  is_parental_consent: boolean;
  created_at: string;
  revoked_at?: string | null;
};

/**
 * Relatório DSAR completo — estrutura hierárquica
 */
export type DsarCompleteReport = {
  metadata: DsarMetadata;
  patient: DsarPatientProfile;
  assessments: DsarAssessment[];
  visits: DsarVisit[];
  access_history: DsarAccessEntry[];
  consents: DsarConsentEntry[];
};

/**
 * Formatos de exportação suportados
 */
export type DsarExportFormat = 'json' | 'csv';

/**
 * Resposta de geração de DSAR
 */
export type DsarGenerationResponse = {
  success: boolean;
  report?: DsarCompleteReport;
  error?: string;
};

/**
 * Resultado de exportação (para download)
 */
export type DsarExportResult = {
  success: boolean;
  content?: string; // conteúdo do arquivo (JSON, CSV, ou base64 PDF)
  filename?: string;
  mimeType?: string;
  error?: string;
};

/**
 * Histórico de geração de DSAR (para UI)
 */
export type DsarGenerationRecord = {
  id: string;
  patient_id: string;
  patient_name: string;
  generated_at: string;
  generated_by_id: string;
  generated_by_email: string;
  format_requested: DsarExportFormat;
  status: 'success' | 'error';
  error_message?: string;
};
