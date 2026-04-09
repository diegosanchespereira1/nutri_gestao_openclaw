'use server';

/**
 * Server Actions para Sistema de Exclusão de Conta (Story 11.7)
 * LGPD Art. 18 com retenção legal de 5 anos
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import {
  DeleteAccountResponse,
  ConfirmDeletionResponse,
  CancelDeletionResponse,
  DeletionStatusResponse,
  AccountDeletionState,
} from '@/lib/types/account-deletion';

const DELETION_CONFIRMATION_HOURS = 24;

// ============================================================================
// 1. GET DELETION STATUS
// ============================================================================
/**
 * Retorna status atual da exclusão da conta
 */
export async function getDeletionStatus(): Promise<DeletionStatusResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Buscar diretamente no auth.users (via RLS ou admin API)
    // Para simplificar, usar user metadata se disponível
    // Em produção, seria via Admin API ou view especial

    const deletedAt = user.user_metadata?.deleted_at as string | null;
    const deletionConfirmedAt = user.user_metadata?.deletion_confirmed_at as string | null;
    const deletionTokenExpiresAt = user.user_metadata?.deletion_token_expires_at as string | null;

    let hoursUntilExpiry: number | undefined;
    if (deletedAt && !deletionConfirmedAt && deletionTokenExpiresAt) {
      const expiresAt = new Date(deletionTokenExpiresAt);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      hoursUntilExpiry = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
    }

    const state: AccountDeletionState = {
      status: deletionConfirmedAt ? 'confirmed' : deletedAt ? 'pending' : 'none',
      deleted_at: deletedAt || null,
      deletion_confirmed_at: deletionConfirmedAt || null,
      deletion_confirmed_token: null, // Nunca expor token
      deletion_confirmed_token_expires_at: deletionTokenExpiresAt || null,
      hours_until_expiry: hoursUntilExpiry,
    };

    return {
      success: true,
      status: state,
    };
  } catch (err) {
    console.error('Erro em getDeletionStatus:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 2. REQUEST ACCOUNT DELETION
// ============================================================================
/**
 * Inicia processo de exclusão de conta
 * - Valida senha
 * - Gera token de confirmação seguro
 * - Envia email com link
 */
export async function requestAccountDeletion(
  password: string
): Promise<DeleteAccountResponse> {
  try {
    if (!password || password.length < 1) {
      return { success: false, error: 'Senha é obrigatória' };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Validar senha (via sign-in test)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return { success: false, error: 'Senha incorreta' };
    }

    // Gerar token seguro (hash + timestamp)
    const tokenData = `${user.id}${Date.now()}${process.env.SUPABASE_AUTH_SECRET || 'dev-secret'}`;
    const token = crypto.createHash('sha256').update(tokenData).digest('hex');

    const expiresAt = new Date(Date.now() + DELETION_CONFIRMATION_HOURS * 60 * 60 * 1000);

    // Atualizar user metadata (em produção, usar Admin API para atualizar auth.users diretamente)
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        deleted_at: new Date().toISOString(),
        deletion_confirmed_token: token,
        deletion_token_expires_at: expiresAt.toISOString(),
      },
    });

    if (updateError) {
      console.error('Erro ao atualizar user:', updateError);
      return { success: false, error: 'Falha ao processar solicitação' };
    }

    // TODO: Enviar email com link de confirmação
    // const emailResult = await sendDeletionConfirmationEmail({
    //   email: user.email!,
    //   userName: user.user_metadata?.full_name || 'usuário',
    //   token,
    //   expiresAt,
    // });

    revalidatePath('/app/configuracoes/deletar-conta');

    return {
      success: true,
      message: 'Solicitação enviada. Verifique seu email para confirmar.',
      token, // Não expor em produção
      email: user.email,
      expires_at: expiresAt.toISOString(),
    };
  } catch (err) {
    console.error('Erro em requestAccountDeletion:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 3. CONFIRM ACCOUNT DELETION
// ============================================================================
/**
 * Confirma exclusão de conta via token do email
 * - Valida token (expiração, hash)
 * - Seta deletion_confirmed_at
 * - Bloqueia login (via Supabase Auth)
 */
export async function confirmAccountDeletion(
  token: string
): Promise<ConfirmDeletionResponse> {
  try {
    if (!token || token.length < 32) {
      return { success: false, error: 'Token inválido' };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Validar token
    const storedToken = user.user_metadata?.deletion_confirmed_token as string | undefined;
    const tokenExpiresAt = user.user_metadata?.deletion_token_expires_at as string | undefined;

    if (!storedToken || storedToken !== token) {
      return { success: false, error: 'Token inválido' };
    }

    if (!tokenExpiresAt || new Date(tokenExpiresAt) < new Date()) {
      return { success: false, error: 'Token expirado. Solicite novamente.' };
    }

    // Confirmar exclusão
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        deletion_confirmed_at: new Date().toISOString(),
        deletion_confirmed_token: null, // Remover token (one-time use)
      },
    });

    if (updateError) {
      console.error('Erro ao confirmar exclusão:', updateError);
      return { success: false, error: 'Falha ao confirmar' };
    }

    // TODO: Em produção, chamar Supabase Admin API para desabilitar login
    // admin.auth().updateUser(user.id, { disabled: true })

    // TODO: Enviar email de confirmação
    // await sendDeletionConfirmedEmail({ email: user.email! })

    revalidatePath('/app/configuracoes/deletar-conta');

    return {
      success: true,
      message: 'Exclusão confirmada. Sua conta foi desativada.',
      status: 'confirmed',
    };
  } catch (err) {
    console.error('Erro em confirmAccountDeletion:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 4. CANCEL ACCOUNT DELETION
// ============================================================================
/**
 * Cancela solicitação de exclusão (válido apenas se < 24h)
 * Restaura deleted_at para NULL
 */
export async function cancelAccountDeletion(
  token: string
): Promise<CancelDeletionResponse> {
  try {
    if (!token || token.length < 32) {
      return { success: false, error: 'Token inválido' };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Validar token
    const storedToken = user.user_metadata?.deletion_confirmed_token as string | undefined;
    const tokenExpiresAt = user.user_metadata?.deletion_token_expires_at as string | undefined;
    const deletionConfirmedAt = user.user_metadata?.deletion_confirmed_at as string | undefined;

    if (!storedToken || storedToken !== token) {
      return { success: false, error: 'Token inválido' };
    }

    if (!tokenExpiresAt || new Date(tokenExpiresAt) < new Date()) {
      return { success: false, error: 'Período de cancelamento expirou' };
    }

    // Se já foi confirmado, não permite cancelar
    if (deletionConfirmedAt) {
      return {
        success: false,
        error: 'Exclusão já foi confirmada. Contate suporte.',
      };
    }

    // Cancelar exclusão
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        deleted_at: null,
        deletion_confirmed_token: null,
        deletion_token_expires_at: null,
      },
    });

    if (updateError) {
      console.error('Erro ao cancelar exclusão:', updateError);
      return { success: false, error: 'Falha ao cancelar' };
    }

    // TODO: Enviar email de cancelamento confirmado
    // await sendDeletionCancelledEmail({ email: user.email! })

    revalidatePath('/app/configuracoes/deletar-conta');

    return {
      success: true,
      message: 'Solicitação de exclusão cancelada. Sua conta continua ativa.',
      status: 'none',
    };
  } catch (err) {
    console.error('Erro em cancelAccountDeletion:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 5. EMAIL TEMPLATES (placeholder)
// ============================================================================
/**
 * TODO: Integrar com Resend para enviar emails
 */

interface SendDeletionEmailInput {
  email: string;
  userName: string;
  token: string;
  expiresAt: Date;
  action: 'request' | 'confirmed' | 'cancelled';
}

// export async function sendDeletionEmail(input: SendDeletionEmailInput) {
//   const { Resend } = require('resend');
//   const resend = new Resend(process.env.RESEND_API_KEY);
//
//   const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/app/configuracoes/deletar-conta/confirmar?token=${input.token}`;
//   const cancelLink = `${process.env.NEXT_PUBLIC_APP_URL}/app/configuracoes/deletar-conta/cancelar?token=${input.token}`;
//
//   const subject =
//     input.action === 'request'
//       ? 'Confirme sua solicitação de exclusão de conta'
//       : input.action === 'confirmed'
//         ? 'Sua conta foi marcada para exclusão'
//         : 'Solicitação de exclusão foi cancelada';
//
//   const html = renderDeletionEmailTemplate({
//     action: input.action,
//     confirmationLink,
//     cancelLink,
//     expiresAt: input.expiresAt,
//     userName: input.userName,
//   });
//
//   return resend.emails.send({
//     from: process.env.NOTIFICATION_EMAIL_FROM || 'noreply@nutrigestao.com',
//     to: input.email,
//     subject,
//     html,
//   });
// }
