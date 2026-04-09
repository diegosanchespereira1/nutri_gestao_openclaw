'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type {
  AuditLogRow,
  AuditLogFilters,
  AuditDsarReport,
} from '@/lib/types/audit';

/** Carrega logs de auditoria do utilizador com paginação e filtros. */
export async function loadAuditLogs(
  filters?: AuditLogFilters & { limit?: number; offset?: number },
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  let q = supabase
    .from('audit_log')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters?.startDate) {
    q = q.gte('created_at', `${filters.startDate}T00:00:00Z`);
  }
  if (filters?.endDate) {
    q = q.lte('created_at', `${filters.endDate}T23:59:59Z`);
  }
  if (filters?.operation) {
    q = q.eq('operation', filters.operation);
  }
  if (filters?.tableName) {
    q = q.eq('table_name', filters.tableName);
  }
  if (filters?.recordId) {
    q = q.eq('record_id', filters.recordId);
  }

  const { data, error } = await q.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Falha ao carregar logs: ${error.message}`);
  }

  return {
    rows: (data as AuditLogRow[]) ?? [],
    total: (data as AuditLogRow[])?.length ?? 0,
  };
}

/** Carrega histórico de acesso a um paciente específico (DSAR). */
export async function loadPatientAccessHistory(
  patientId: string,
): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Validar que o paciente pertence ao utilizador
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name, user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientError || !patient) {
    throw new Error('Paciente não encontrado');
  }

  if (patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  // Carregar logs de acesso ao paciente
  const { data: logs, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('status', 'active')
    .eq('record_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar histórico: ${error.message}`);
  }

  return (logs as AuditLogRow[]) ?? [];
}

/** Gera relatório DSAR (Data Subject Access Request) para um paciente. */
export async function generateDsarReport(
  patientId: string,
): Promise<AuditDsarReport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Validar que o paciente pertence ao utilizador
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name, user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientError || !patient) {
    throw new Error('Paciente não encontrado');
  }

  if (patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  // Carregar logs de acesso
  const { data: logs, error: logsError } = await supabase
    .from('audit_log')
    .select(
      `
      *,
      auth_users:user_id (
        email
      )
    `,
    )
    .eq('status', 'active')
    .eq('record_id', patientId)
    .order('created_at', { ascending: false });

  if (logsError) {
    throw new Error(`Falha ao gerar relatório: ${logsError.message}`);
  }

  // Construir relatório DSAR
  type LogWithUser = AuditLogRow & {
    auth_users?: { email: string } | null;
  };

  const accessHistory = ((logs ?? []) as LogWithUser[]).map((log) => ({
    userId: log.user_id,
    userEmail: log.auth_users?.email ?? 'Utilizador desconhecido',
    timestamp: log.created_at,
    operation: log.operation,
    tableName: log.table_name,
    dataChanged: log.new_values,
  }));

  return {
    patientId,
    patientName: patient.full_name,
    accessHistory,
    generatedAt: new Date().toISOString(),
    generatedBy: user.id,
  };
}

/** Exporta auditoria de um paciente como CSV. */
export async function exportPatientAuditCsv(
  patientId: string,
): Promise<string> {
  const report = await generateDsarReport(patientId);

  // Cabeçalho CSV
  const csvRows = [
    'Data,Hora,Utilizador,Email,Operação,Tipo de Registo',
    ...report.accessHistory.map((entry) => {
      const [date, time] = new Date(entry.timestamp)
        .toISOString()
        .split('T');
      const timeStr = time.slice(0, 5);
      return [
        date,
        timeStr,
        entry.userId,
        entry.userEmail,
        entry.operation,
        entry.tableName,
      ]
        .map((v) => `"${v}"`)
        .join(',');
    }),
  ];

  return csvRows.join('\n');
}

/** Marca logs como expirados (retenção de 12 meses). */
export async function expireOldLogs(): Promise<{ count: number }> {
  const supabase = await createClient();

  // Esta função deveria ser chamada por um cron job
  // Aqui apenas marcamos como exemplo — em produção, usar Supabase Functions

  const { error, data } = await supabase
    .from('audit_log')
    .update({ status: 'expired' })
    .lte('expires_at', new Date().toISOString())
    .eq('status', 'active')
    .select('id');

  if (error) {
    throw new Error(`Falha ao expirar logs: ${error.message}`);
  }

  return { count: data?.length ?? 0 };
}

/** Exporta auditoria de um paciente como JSON (para visualização e impressão). */
export async function exportPatientAuditJson(
  patientId: string,
): Promise<string> {
  const report = await generateDsarReport(patientId);

  return JSON.stringify(report, null, 2);
}
