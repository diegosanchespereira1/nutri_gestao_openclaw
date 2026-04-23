export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuditStatus = 'active' | 'expired';

export type AuditLogRow = {
  id: string;
  user_id: string;
  /** Utilizador que executou a mutação (quando registado pelo trigger). */
  actor_user_id?: string | null;
  table_name: string;
  operation: AuditOperation;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string | null;
  status: AuditStatus;
};

export type AuditLogWithContext = AuditLogRow & {
  // Contexto adicional para exibição
  user_email?: string; // Carregado via join
  record_type?: string; // Tipo de registro (ex: "Paciente", "Avaliação")
  /** Nome em `profiles` do utilizador que executou a mutação (`actor_user_id`). */
  actor_full_name?: string | null;
};

export type AuditLogFilters = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  operation?: AuditOperation;
  tableName?: string;
  recordId?: string;
};

export type AuditDsarReport = {
  patientId: string;
  patientName: string;
  accessHistory: Array<{
    userId: string;
    userEmail: string;
    timestamp: string;
    operation: AuditOperation;
    tableName: string;
    dataChanged: Record<string, unknown> | null;
  }>;
  generatedAt: string;
  generatedBy: string;
};
