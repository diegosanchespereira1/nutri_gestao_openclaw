'use server';

import { redirect } from 'next/navigation';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type {
  DsarCompleteReport,
  DsarExportFormat,
  DsarExportResult,
  DsarGenerationResponse,
  DsarAccessEntry,
  DsarConsentEntry,
  DsarAssessment,
  DsarVisit,
} from '@/lib/types/dsar';
import type { AuditLogRow } from '@/lib/types/audit';
import type { ConsentRecord } from '@/lib/types/consent';
import Papa from 'papaparse';

const uuidSchema = z.string().uuid('ID deve ser um UUID válido');

/**
 * Gera o relatório DSAR completo com todos os dados do paciente
 */
export async function generateCompletePatientDsar(
  patientId: string
): Promise<DsarGenerationResponse> {
  try {
    // Validar UUID
    const validatedId = uuidSchema.parse(patientId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 1. Carregar dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', validatedId)
      .maybeSingle();

    if (patientError || !patient) {
      return { success: false, error: 'Paciente não encontrado' };
    }

    if (patient.user_id !== user.id) {
      // Registar tentativa de acesso negado em auditoria
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          table_name: 'patients',
          operation: 'SELECT',
          record_id: validatedId,
          new_values: { event: 'DSAR_ACCESS_DENIED' },
          created_at: new Date().toISOString(),
        });
      return { success: false, error: 'Acesso negado a este paciente' };
    }

    // 2. Carregar avaliações nutricionais
    const { data: assessments } = await supabase
      .from('patient_nutrition_assessments')
      .select('*')
      .eq('patient_id', validatedId)
      .order('assessment_date', { ascending: false });

    const dsarAssessments: DsarAssessment[] = (assessments ?? []).map(a => ({
      id: a.id,
      assessment_date: a.assessment_date,
      assessment_type: a.assessment_type,
      data: a.data || {},
      created_at: a.created_at,
    }));

    // 3. Carregar histórico de auditoria (acesso aos dados)
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select(
        `
        id,
        operation,
        record_id,
        table_name,
        new_values,
        old_values,
        created_at,
        user_id,
        auth_users:user_id (email)
      `
      )
      .eq('record_id', validatedId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);

    interface AuditWithUser {
      id: string;
      user_id: string;
      operation: string;
      table_name: string;
      record_id: string | null;
      new_values: Record<string, unknown> | null;
      old_values: Record<string, unknown> | null;
      created_at: string;
      auth_users?: { email: string } | null;
    }

    const dsarAccessHistory: DsarAccessEntry[] = ((auditLogs ?? []) as unknown as AuditWithUser[]).map(log => ({
      timestamp: log.created_at,
      user_id: log.user_id,
      user_email: log.auth_users?.email ?? 'Utilizador desconhecido',
      operation: log.operation as 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT',
      table_name: log.table_name,
      data_changed: log.new_values,
    }));

    // 4. Carregar consentimentos
    const { data: consents } = await supabase
      .from('consent_records')
      .select('*')
      .eq('patient_id', validatedId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const dsarConsents: DsarConsentEntry[] = (consents ?? []).map(c => ({
      id: c.id,
      consent_type: c.consent_type,
      status: c.status as 'active' | 'revogado',
      is_parental_consent: c.is_parental_consent,
      created_at: c.created_at,
      revoked_at: c.revoked_at,
    }));

    // 5. Compilar relatório completo
    const report: DsarCompleteReport = {
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        data_integrity_hash: '', // Será preenchido após
        version: '1.0',
      },
      patient: {
        id: patient.id,
        full_name: patient.full_name,
        document_id: patient.document_id || 'N/A',
        date_of_birth: patient.date_of_birth || 'N/A',
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        postal_code: patient.postal_code,
      },
      assessments: dsarAssessments,
      visits: [],
      access_history: dsarAccessHistory,
      consents: dsarConsents,
    };

    // 6. Gerar hash de integridade (SHA-256)
    const dataToHash = JSON.stringify({
      patient: report.patient,
      assessments: report.assessments,
      access_history: report.access_history,
      consents: report.consents,
    });
    report.metadata.data_integrity_hash = createHash('sha256').update(dataToHash).digest('hex');

    // 7. Registar geração em auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        table_name: 'patients',
        operation: 'SELECT',
        record_id: validatedId,
        new_values: { event: 'DSAR_GENERATED', format_requested: 'complete' },
        created_at: new Date().toISOString(),
      });

    return { success: true, report };
  } catch (error) {
    console.error('[generateCompletePatientDsar] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar relatório DSAR',
    };
  }
}

/**
 * Exporta relatório DSAR como JSON
 */
export async function exportDsarAsJson(patientId: string): Promise<DsarExportResult> {
  try {
    const response = await generateCompletePatientDsar(patientId);
    if (!response.success || !response.report) {
      return { success: false, error: response.error };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const filename = `DSAR_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(response.report, null, 2);

    // Registar exportação
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        table_name: 'patients',
        operation: 'SELECT',
        record_id: patientId,
        new_values: { event: 'DSAR_EXPORTED', format: 'json' },
        created_at: new Date().toISOString(),
      });

    return {
      success: true,
      content,
      filename,
      mimeType: 'application/json',
    };
  } catch (error) {
    console.error('[exportDsarAsJson] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar JSON',
    };
  }
}

/**
 * Exporta relatório DSAR como CSV
 */
export async function exportDsarAsCsv(patientId: string): Promise<DsarExportResult> {
  try {
    const response = await generateCompletePatientDsar(patientId);
    if (!response.success || !response.report) {
      return { success: false, error: response.error };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const report = response.report;
    const csvSections: string[] = [];

    // Seção 1: Metadados
    csvSections.push('RELATÓRIO DSAR - DADOS PESSOAIS DO PACIENTE');
    csvSections.push(`Gerado em,${report.metadata.generated_at}`);
    csvSections.push(`Data de Integridade,${report.metadata.data_integrity_hash}`);
    csvSections.push('');

    // Seção 2: Perfil
    csvSections.push('=== PERFIL DO PACIENTE ===');
    csvSections.push('Campo,Valor');
    csvSections.push(`Nome,${report.patient.full_name}`);
    csvSections.push(`Documento (CPF),${report.patient.document_id}`);
    csvSections.push(`Data Nascimento,${report.patient.date_of_birth}`);
    csvSections.push(`Email,${report.patient.email || 'N/A'}`);
    csvSections.push(`Telefone,${report.patient.phone || 'N/A'}`);
    csvSections.push(`Endereço,${report.patient.address || 'N/A'}`);
    csvSections.push('');

    // Seção 3: Avaliações
    csvSections.push('=== AVALIAÇÕES NUTRICIONAIS ===');
    csvSections.push('ID,Data,Tipo,Criado em');
    report.assessments.forEach(a => {
      csvSections.push(`"${a.id}","${a.assessment_date}","${a.assessment_type || 'N/A'}","${a.created_at}"`);
    });
    csvSections.push('');

    // Seção 4: Histórico de Acesso
    csvSections.push('=== HISTÓRICO DE ACESSO (AUDITORIA) ===');
    csvSections.push('Timestamp,Email,Operação,Tabela');
    report.access_history.forEach(entry => {
      csvSections.push(`"${entry.timestamp}","${entry.user_email}","${entry.operation}","${entry.table_name}"`);
    });
    csvSections.push('');

    // Seção 5: Consentimentos
    csvSections.push('=== CONSENTIMENTOS ===');
    csvSections.push('Tipo,Status,Data,Parental');
    report.consents.forEach(c => {
      csvSections.push(`"${c.consent_type}","${c.status}","${c.created_at}","${c.is_parental_consent ? 'Sim' : 'Não'}"`);
    });

    const filename = `DSAR_${patientId}_${new Date().toISOString().split('T')[0]}.csv`;
    const content = csvSections.join('\n');

    // Registar exportação
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        table_name: 'patients',
        operation: 'SELECT',
        record_id: patientId,
        new_values: { event: 'DSAR_EXPORTED', format: 'csv' },
        created_at: new Date().toISOString(),
      });

    return {
      success: true,
      content,
      filename,
      mimeType: 'text/csv',
    };
  } catch (error) {
    console.error('[exportDsarAsCsv] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar CSV',
    };
  }
}

/**
 * Envia relatório DSAR por email (usando Resend)
 */
export async function sendDsarByEmail(
  patientId: string,
  format: 'json' | 'csv' = 'json'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Validar que paciente pertence ao utilizador
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, user_id')
      .eq('id', patientId)
      .maybeSingle();

    if (!patient || patient.user_id !== user.id) {
      return { success: false, error: 'Acesso negado a este paciente' };
    }

    // Gerar relatório
    const dsarResponse = await generateCompletePatientDsar(patientId);
    if (!dsarResponse.success) {
      return { success: false, error: dsarResponse.error };
    }

    // Exportar em formato solicitado
    const exportResponse = format === 'csv'
      ? await exportDsarAsCsv(patientId)
      : await exportDsarAsJson(patientId);

    if (!exportResponse.success) {
      return { success: false, error: exportResponse.error };
    }

    // Carregar email do utilizador
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = authUser?.email || 'professionalmail@example.com';

    // Template de email LGPD
    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .highlight { background-color: #ffeaa7; padding: 10px; border-left: 4px solid #fdcb6e; }
    .footer { border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Seu Relatório DSAR</h1>
      <p>Direito de Acesso — LGPD Art. 18</p>
    </div>

    <div class="section">
      <p>Prezado(a) Profissional,</p>
      <p>Em resposta a um pedido de acesso a dados pessoais (Direito de Acesso conforme LGPD Art. 18), segue em anexo o relatório completo de dados pessoais de:</p>

      <div class="highlight">
        <strong>Paciente:</strong> ${patient.full_name}<br>
        <strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-PT')}<br>
        <strong>Formato:</strong> ${format === 'csv' ? 'CSV (Tabular)' : 'JSON (Estruturado)'}
      </div>
    </div>

    <div class="section">
      <h3>O que está incluído no relatório:</h3>
      <ul>
        <li>Dados pessoais cadastrados (perfil, contato, documentos)</li>
        <li>Histórico de avaliações nutricionais</li>
        <li>Histórico completo de ACESSO aos dados (auditoria)</li>
        <li>Consentimentos registados e revogações</li>
        <li>Hash de integridade dos dados (SHA-256) para verificação</li>
      </ul>
    </div>

    <div class="section">
      <h3>Informações Importantes:</h3>
      <p>
        Este relatório contém dados pessoais sensíveis de saúde. Recomenda-se:
      </p>
      <ul>
        <li>Transmitir com segurança (ex: email cifrado ou transferência segura)</li>
        <li>Guardar com confidencialidade</li>
        <li>Verificar a integridade usando o hash SHA-256 fornecido</li>
      </ul>
    </div>

    <div class="section">
      <p>Para dúvidas ou necessidade de cópia adicional, responda a este email.</p>
    </div>

    <div class="footer">
      <p>Relatório gerado automaticamente pelo sistema NutriGestão — Compliance LGPD</p>
      <p>Este email foi enviado como resposta a um pedido de acesso a dados pessoais.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email via Resend (se disponível)
    try {
      const resendModule = await import('resend');
      const { Resend } = resendModule;
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        return { success: false, error: 'Email não configurado (RESEND_API_KEY ausente)' };
      }

      const resend = new Resend(apiKey);

      await resend.emails.send({
        from: process.env.DOSSIER_EMAIL_FROM || 'noreply@nutrigestao.app',
        to: userEmail,
        subject: `DSAR - Relatório de Dados Pessoais: ${patient.full_name}`,
        html: emailTemplate,
        attachments: [
          {
            filename: exportResponse.filename || `DSAR_${patientId}.${format}`,
            content: Buffer.from(exportResponse.content || '').toString('base64'),
          },
        ],
      });

      // Registar envio
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          table_name: 'patients',
          operation: 'SELECT',
          record_id: patientId,
          new_values: { event: 'DSAR_EMAIL_SENT', format, sent_to: userEmail },
          created_at: new Date().toISOString(),
        });

      return { success: true };
    } catch (emailError) {
      console.error('[sendDsarByEmail] Resend error:', emailError);
      return { success: false, error: 'Erro ao enviar email' };
    }
  } catch (error) {
    console.error('[sendDsarByEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar email',
    };
  }
}
