'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ConsentRecord, RecordConsentInput, RevokeConsentInput, PatientConsentSummary } from '@/lib/types/consent';
import { headers } from 'next/headers';

/**
 * Registra um novo consentimento digital para um paciente
 * LGPD Art. 7 — Consentimento como base legal
 */
export async function recordConsent(input: RecordConsentInput): Promise<{ success: boolean; consentId?: string; error?: string }> {
  const supabase = await createClient();
  const headersList = await headers();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que paciente pertence ao utilizador
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, user_id, date_of_birth')
    .eq('id', input.patientId)
    .maybeSingle();

  if (patientError || !patient) {
    return { success: false, error: 'Paciente não encontrado' };
  }

  if (patient.user_id !== user.id) {
    return { success: false, error: 'Acesso negado a este paciente' };
  }

  // Calcular idade
  const birthDate = new Date(patient.date_of_birth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear() -
    (today.getMonth() < birthDate.getMonth() ||
     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

  // Se menor de idade, validar consentimento parental
  if (age < 18 && !input.isParentalConsent) {
    // Verificar se já existe consentimento parental ativo
    const { data: existingParental } = await supabase
      .from('consent_records')
      .select('id')
      .eq('patient_id', input.patientId)
      .eq('user_id', user.id)
      .eq('is_parental_consent', true)
      .eq('status', 'active')
      .eq('consent_type', input.consentType)
      .maybeSingle();

    if (!existingParental) {
      return {
        success: false,
        error: 'Consentimento de responsável legal é obrigatório para pacientes menores de 18 anos'
      };
    }
  }

  // Colecionar IP e user-agent
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Inserir consentimento
  const { data: consent, error } = await supabase
    .from('consent_records')
    .insert({
      patient_id: input.patientId,
      user_id: user.id,
      consent_type: input.consentType,
      is_parental_consent: input.isParentalConsent || false,
      parental_consent_name: input.parentalConsentName || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'active'
    })
    .select('id')
    .single();

  if (error) {
    console.error('[recordConsent] Insert failed:', error);
    return { success: false, error: `Erro ao registar consentimento: ${error.message}` };
  }

  return { success: true, consentId: consent?.id };
}

/**
 * Revoga um consentimento existente (soft-delete com status = 'revogado')
 * Mantém registo imutável para prova legal
 */
export async function revokeConsent(input: RevokeConsentInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que consentimento pertence ao utilizador
  const { data: consent, error: fetchError } = await supabase
    .from('consent_records')
    .select('id, user_id')
    .eq('id', input.consentRecordId)
    .maybeSingle();

  if (fetchError || !consent) {
    return { success: false, error: 'Consentimento não encontrado' };
  }

  if (consent.user_id !== user.id) {
    return { success: false, error: 'Acesso negado a este consentimento' };
  }

  // Atualizar status para 'revogado'
  const { error } = await supabase
    .from('consent_records')
    .update({
      status: 'revogado',
      revocation_reason: input.revocationReason,
      revoked_at: new Date().toISOString()
    })
    .eq('id', input.consentRecordId);

  if (error) {
    console.error('[revokeConsent] Update failed:', error);
    return { success: false, error: `Erro ao revogar consentimento: ${error.message}` };
  }

  return { success: true };
}

/**
 * Carrega todos os consentimentos ativos de um paciente
 */
export async function loadPatientConsents(patientId: string): Promise<ConsentRecord[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que paciente pertence ao utilizador
  const { data: patient } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (!patient || patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  const { data: consents, error } = await supabase
    .from('consent_records')
    .select('*')
    .eq('patient_id', patientId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar consentimentos: ${error.message}`);
  }

  return (consents as ConsentRecord[]) ?? [];
}

/**
 * Valida se um paciente menor tem consentimento parental válido
 * Retorna true se paciente é maior ou tem consentimento parental ativo
 */
export async function validateMinorConsent(patientId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que paciente pertence ao utilizador
  const { data: patient } = await supabase
    .from('patients')
    .select('id, user_id, date_of_birth')
    .eq('id', patientId)
    .maybeSingle();

  if (!patient || patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  // Calcular idade
  const birthDate = new Date(patient.date_of_birth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear() -
    (today.getMonth() < birthDate.getMonth() ||
     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

  // Se maior de idade, consentimento já validado
  if (age >= 18) {
    return true;
  }

  // Se menor, verificar se existe consentimento parental ativo
  const { data: parentalConsent } = await supabase
    .from('consent_records')
    .select('id')
    .eq('patient_id', patientId)
    .eq('user_id', user.id)
    .eq('is_parental_consent', true)
    .eq('status', 'active')
    .maybeSingle();

  return !!parentalConsent;
}

/**
 * Carrega sumário de consentimentos ativos de um paciente
 */
export async function loadPatientConsentSummary(patientId: string): Promise<PatientConsentSummary> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que paciente pertence ao utilizador
  const { data: patient } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (!patient || patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  const { data: consents } = await supabase
    .from('consent_records')
    .select('consent_type, is_parental_consent, created_at, status')
    .eq('patient_id', patientId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const activeConsents = (consents ?? []) as Array<{
    consent_type: string;
    is_parental_consent: boolean;
    created_at: string;
  }>;

  const consentTypes = [...new Set(activeConsents.map(c => c.consent_type))] as any[];
  const hasParentalConsent = activeConsents.some(c => c.is_parental_consent);
  const lastConsentDate = activeConsents[0]?.created_at ?? null;

  return {
    patientId,
    consentTypes,
    hasParentalConsent,
    lastConsentDate
  };
}

/**
 * Carrega consentimentos com informações do utilizador (para admin view)
 */
export async function loadPatientConsentsWithUser(patientId: string): Promise<(ConsentRecord & { user_email: string })[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validar que paciente pertence ao utilizador
  const { data: patient } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (!patient || patient.user_id !== user.id) {
    throw new Error('Acesso negado a este paciente');
  }

  const { data: consents, error } = await supabase
    .from('consent_records')
    .select(
      `
      *,
      auth_users:user_id (
        email
      )
    `
    )
    .eq('patient_id', patientId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar consentimentos: ${error.message}`);
  }

  type ConsentWithUser = ConsentRecord & {
    auth_users?: { email: string } | null;
  };

  return ((consents ?? []) as ConsentWithUser[]).map(c => ({
    ...c,
    user_email: c.auth_users?.email ?? 'Utilizador desconhecido'
  }));
}
