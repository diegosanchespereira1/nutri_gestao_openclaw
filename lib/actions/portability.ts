'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type {
  PortabilityCompleteReport,
  PortabilityExportFormat,
  PortabilityExportResult,
  PortabilityGenerationResponse,
} from '@/lib/types/portability';

/**
 * Gera o relatório de portabilidade completo com todos os dados do profissional
 */
export async function generateProfessionalDataPortability(
  userId?: string
): Promise<PortabilityGenerationResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');

    const targetUserId = userId || user.id;

    // Se tentar acessar dados de outro profissional
    if (userId && userId !== user.id) {
      // Registar tentativa de acesso não autorizado
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          table_name: 'users',
          operation: 'SELECT',
          record_id: userId,
          new_values: { event: 'PORTABILITY_ACCESS_DENIED' },
          created_at: new Date().toISOString(),
        });
      return { success: false, error: 'Acesso negado' };
    }

    // 1. Dados do profissional
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(targetUserId);
    if (!authUser) {
      return { success: false, error: 'Profissional não encontrado' };
    }

    // 2. Clientes
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 3. Estabelecimentos
    const { data: establishments } = await supabase
      .from('establishments')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 4. Pacientes
    const { data: patients } = await supabase
      .from('patients')
      .select('id, full_name, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 5. Consentimentos (que o profissional gerencia)
    const { data: consents } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 6. Compilar relatório
    const report: PortabilityCompleteReport = {
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: targetUserId,
        version: '1.0',
        lgpd_article: 'Art. 20',
      },
      professional: {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || 'N/A',
        email: authUser.email || 'N/A',
        crn: authUser.user_metadata?.crn,
        phone: authUser.user_metadata?.phone,
        subscription_plan: 'standard', // Seria obtido de tabela de subscrição
        is_active: !authUser.deleted_at,
        created_at: authUser.created_at,
      },
      clients: {
        count: clients?.length || 0,
        data: (clients ?? []).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          document: c.document || 'N/A',
          email: c.email,
          phone: c.phone,
          created_at: c.created_at,
        })),
      },
      establishments: {
        count: establishments?.length || 0,
        data: (establishments ?? []).map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
          client_id: e.client_id,
          address: e.address,
          city: e.city,
          state: e.state,
          created_at: e.created_at,
        })),
      },
      patients: {
        count: patients?.length || 0,
        data: (patients ?? []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          linked_to: 'patient_reference',
          created_at: p.created_at,
        })),
      },
      consents: {
        count: consents?.length || 0,
        data: (consents ?? []).map(c => ({
          id: c.id,
          patient_id: c.patient_id,
          consent_type: c.consent_type,
          status: c.status,
          created_at: c.created_at,
        })),
      },
      settings: {
        theme: 'light',
        language: 'pt-PT',
        email_notifications: true,
        push_notifications: false,
      },
    };

    // Registar geração em auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: targetUserId,
        table_name: 'users',
        operation: 'SELECT',
        record_id: targetUserId,
        new_values: { event: 'PORTABILITY_GENERATED', format: 'complete' },
        created_at: new Date().toISOString(),
      });

    return { success: true, report };
  } catch (error) {
    console.error('[generateProfessionalDataPortability] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar relatório de portabilidade',
    };
  }
}

/**
 * Exporta relatório de portabilidade como JSON
 */
export async function exportPortabilityAsJson(userId?: string): Promise<PortabilityExportResult> {
  try {
    const response = await generateProfessionalDataPortability(userId);
    if (!response.success || !response.report) {
      return { success: false, error: response.error };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');

    const filename = `MEUS_DADOS_${user.id}_${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(response.report, null, 2);

    // Registar exportação
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        table_name: 'users',
        operation: 'SELECT',
        record_id: user.id,
        new_values: { event: 'PORTABILITY_EXPORTED', format: 'json' },
        created_at: new Date().toISOString(),
      });

    return {
      success: true,
      content,
      filename,
      mimeType: 'application/json',
    };
  } catch (error) {
    console.error('[exportPortabilityAsJson] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar JSON',
    };
  }
}

/**
 * Exporta relatório de portabilidade como CSV
 */
export async function exportPortabilityAsCsv(userId?: string): Promise<PortabilityExportResult> {
  try {
    const response = await generateProfessionalDataPortability(userId);
    if (!response.success || !response.report) {
      return { success: false, error: response.error };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');

    const report = response.report;
    const csvSections: string[] = [];

    // Cabeçalho
    csvSections.push('RELATÓRIO DE PORTABILIDADE - MEUS DADOS');
    csvSections.push(`Gerado em,${report.metadata.generated_at}`);
    csvSections.push('');

    // Seção 1: Perfil do Profissional
    csvSections.push('=== PERFIL DO PROFISSIONAL ===');
    csvSections.push('Campo,Valor');
    csvSections.push(`Nome,${report.professional.full_name}`);
    csvSections.push(`Email,${report.professional.email}`);
    csvSections.push(`CRN,${report.professional.crn || 'N/A'}`);
    csvSections.push(`Telefone,${report.professional.phone || 'N/A'}`);
    csvSections.push(`Plano,${report.professional.subscription_plan || 'N/A'}`);
    csvSections.push(`Ativo,${report.professional.is_active ? 'Sim' : 'Não'}`);
    csvSections.push(`Cadastrado em,${report.professional.created_at}`);
    csvSections.push('');

    // Seção 2: Clientes
    csvSections.push('=== CLIENTES ===');
    csvSections.push(`Total de Clientes,${report.clients.count}`);
    csvSections.push('ID,Nome,Tipo,Documento,Email,Criado em');
    report.clients.data.forEach(c => {
      csvSections.push(
        `"${c.id}","${c.name}","${c.type}","${c.document}","${c.email || 'N/A'}","${c.created_at}"`
      );
    });
    csvSections.push('');

    // Seção 3: Estabelecimentos
    csvSections.push('=== ESTABELECIMENTOS ===');
    csvSections.push(`Total de Estabelecimentos,${report.establishments.count}`);
    csvSections.push('ID,Nome,Tipo,Cidade,Estado,Criado em');
    report.establishments.data.forEach(e => {
      csvSections.push(
        `"${e.id}","${e.name}","${e.type}","${e.city || 'N/A'}","${e.state || 'N/A'}","${e.created_at}"`
      );
    });
    csvSections.push('');

    // Seção 4: Pacientes
    csvSections.push('=== PACIENTES ===');
    csvSections.push(`Total de Pacientes,${report.patients.count}`);
    csvSections.push('ID,Nome,Criado em');
    report.patients.data.forEach(p => {
      csvSections.push(`"${p.id}","${p.full_name}","${p.created_at}"`);
    });
    csvSections.push('');

    // Seção 5: Consentimentos
    csvSections.push('=== CONSENTIMENTOS ===');
    csvSections.push(`Total de Consentimentos,${report.consents.count}`);
    csvSections.push('ID Paciente,Tipo,Status,Criado em');
    report.consents.data.forEach(c => {
      csvSections.push(`"${c.patient_id}","${c.consent_type}","${c.status}","${c.created_at}"`);
    });

    const filename = `MEUS_DADOS_${user.id}_${new Date().toISOString().split('T')[0]}.csv`;
    const content = csvSections.join('\n');

    // Registar exportação
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        table_name: 'users',
        operation: 'SELECT',
        record_id: user.id,
        new_values: { event: 'PORTABILITY_EXPORTED', format: 'csv' },
        created_at: new Date().toISOString(),
      });

    return {
      success: true,
      content,
      filename,
      mimeType: 'text/csv',
    };
  } catch (error) {
    console.error('[exportPortabilityAsCsv] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar CSV',
    };
  }
}
