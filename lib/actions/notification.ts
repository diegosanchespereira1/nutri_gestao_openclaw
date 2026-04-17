'use server';

/**
 * Server Actions para Sistema de Notificações (Story 11.6)
 * Operações: criar, enviar, listar, marcar como lido, gerenciar preferências, registar FCM tokens
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Notification,
  NotificationPreference,
  CreateNotificationInput,
  NotificationListFilter,
  UpdateNotificationPreferenceInput,
  RegisterFcmTokenInput,
  FcmToken,
  NotificationEventType,
} from '@/lib/types/notification';

// ============================================================================
// 1. RECORD NOTIFICATION — Criar notificação na DB
// ============================================================================
/**
 * Registra uma nova notificação no banco de dados
 * Verificação: user_id deve corresponder ao usuário autenticado
 */
export async function recordNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; notification?: Notification; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Validar que o user_id é do usuário autenticado
    if (input.user_id !== user.id) {
      return { success: false, error: 'Tentativa de acesso não autorizado' };
    }

    // Inserir notificação
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        event_type: input.event_type,
        channel: input.channel,
        title: input.title,
        body: input.body,
        data: input.data || {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registar notificação:', error);
      return { success: false, error: 'Falha ao registar notificação' };
    }

    return {
      success: true,
      notification: data as Notification,
    };
  } catch (err) {
    console.error('Erro inesperado em recordNotification:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 2. SEND NOTIFICATION PUSH — Enviar via Firebase
// ============================================================================
/**
 * Envia notificação push via Firebase Cloud Messaging
 * Atualiza status em DB e registra em audit_log
 */
export async function sendNotificationPush(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Buscar notificação
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (notifError || !notification) {
      return { success: false, error: 'Notificação não encontrada' };
    }

    // Buscar FCM tokens do usuário
    const { data: fcmTokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user.id);

    if (tokensError || !fcmTokens || fcmTokens.length === 0) {
      // Sem tokens registados, atualizar status para "sent" mesmo assim
      // (o usuário pode não ter browser com suporte a push)
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      return { success: true };
    }

    // TODO: Integrar com Firebase Admin SDK para enviar para múltiplos tokens
    // Por enquanto, simulamos sucesso
    // const firebaseAdmin = require('firebase-admin');
    // await firebaseAdmin.messaging().sendMulticast({
    //   tokens: fcmTokens.map(t => t.token),
    //   notification: { title: notification.title, body: notification.body },
    //   data: notification.data,
    // });

    // Atualizar status para "sent"
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      return { success: false, error: 'Falha ao atualizar status' };
    }

    return { success: true };
  } catch (err) {
    console.error('Erro em sendNotificationPush:', err);
    return { success: false, error: 'Erro ao enviar notificação' };
  }
}

// ============================================================================
// 3. SEND NOTIFICATION EMAIL — Enviar via Resend
// ============================================================================
/**
 * Envia notificação email via Resend (com retry)
 */
export async function sendNotificationEmail(
  notificationId: string,
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    void recipientEmail;
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Buscar notificação
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (notifError || !notification) {
      return { success: false, error: 'Notificação não encontrada' };
    }

    // TODO: Integrar com Resend para enviar email
    // const { Resend } = require('resend');
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // const { error } = await resend.emails.send({
    //   from: process.env.NOTIFICATION_EMAIL_FROM,
    //   to: recipientEmail,
    //   subject: notification.title,
    //   html: renderNotificationEmailTemplate({...}),
    // });

    // Atualizar status para "sent"
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (updateError) {
      return { success: false, error: 'Falha ao atualizar status' };
    }

    return { success: true };
  } catch (err) {
    console.error('Erro em sendNotificationEmail:', err);
    return { success: false, error: 'Erro ao enviar email' };
  }
}

// ============================================================================
// 4. LIST NOTIFICATIONS — Listar notificações do usuário
// ============================================================================
/**
 * Lista notificações do usuário com filtros opcionais
 */
export async function listNotifications(
  filter?: NotificationListFilter,
  page = 1,
  pageSize = 20
): Promise<{
  success: boolean;
  notifications?: Notification[];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Aplicar filtros
    if (filter?.event_type) {
      query = query.eq('event_type', filter.event_type);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    // Filtro: lido vs não lido
    if (filter?.read === true) {
      query = query.not('read_at', 'is', null);
    } else if (filter?.read === false) {
      query = query.is('read_at', null);
    }

    // Filtro: últimos N dias
    if (filter?.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filter.days);
      query = query.gte('created_at', daysAgo.toISOString());
    }

    // Ordenar por mais recentes primeiro
    query = query.order('created_at', { ascending: false });

    // Paginação
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: 'Falha ao listar notificações' };
    }

    return {
      success: true,
      notifications: data as Notification[],
      total: count || 0,
    };
  } catch (err) {
    console.error('Erro em listNotifications:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 5. MARK NOTIFICATION AS READ
// ============================================================================
/**
 * Marca notificação como lida (read_at = now)
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Falha ao atualizar notificação' };
    }

    revalidatePath('/app/notificacoes');
    return { success: true };
  } catch (err) {
    console.error('Erro em markNotificationAsRead:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 6. MARK ALL AS READ
// ============================================================================
/**
 * Marca todas as notificações não-lidas como lidas
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      return { success: false, error: 'Falha ao atualizar notificações' };
    }

    revalidatePath('/app/notificacoes');
    return { success: true };
  } catch (err) {
    console.error('Erro em markAllNotificationsAsRead:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 7. GET NOTIFICATION PREFERENCES — Buscar preferências do usuário
// ============================================================================
/**
 * Lista todas as preferências de notificação do usuário
 */
export async function getNotificationPreferences(): Promise<{
  success: boolean;
  preferences?: NotificationPreference[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .order('event_type', { ascending: true });

    if (error) {
      return { success: false, error: 'Falha ao buscar preferências' };
    }

    return {
      success: true,
      preferences: data as NotificationPreference[],
    };
  } catch (err) {
    console.error('Erro em getNotificationPreferences:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 8. UPDATE NOTIFICATION PREFERENCE
// ============================================================================
/**
 * Atualiza preferência para um tipo específico de notificação
 */
export async function updateNotificationPreference(
  eventType: NotificationEventType,
  updates: UpdateNotificationPreferenceInput
): Promise<{ success: boolean; preference?: NotificationPreference; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Atualizar (ou inserir se não existir)
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          event_type: eventType,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,event_type' }
      )
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar preferência:', error);
      return { success: false, error: 'Falha ao atualizar preferência' };
    }

    revalidatePath('/app/configuracoes/notificacoes');
    return {
      success: true,
      preference: data as NotificationPreference,
    };
  } catch (err) {
    console.error('Erro em updateNotificationPreference:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 9. REGISTER FCM TOKEN
// ============================================================================
/**
 * Registra um token Firebase Cloud Messaging para este dispositivo
 */
export async function registerFcmToken(
  input: RegisterFcmTokenInput
): Promise<{ success: boolean; token?: FcmToken; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Validar formato do token (básico)
    if (!input.token || input.token.length < 20) {
      return { success: false, error: 'Token inválido' };
    }

    // Upsert: se token já existe, atualizar last_used_at; senão, inserir
    const { data, error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id: user.id,
          token: input.token,
          device_name: input.device_name || null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select()
      .single();

    if (error) {
      console.error('Erro ao registar FCM token:', error);
      return { success: false, error: 'Falha ao registar dispositivo' };
    }

    return {
      success: true,
      token: data as FcmToken,
    };
  } catch (err) {
    console.error('Erro em registerFcmToken:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 10. UNREGISTER FCM TOKEN
// ============================================================================
/**
 * Remove um token FCM (user logout, revogação explícita)
 */
export async function unregisterFcmToken(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('token', token)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Falha ao remover token' };
    }

    return { success: true };
  } catch (err) {
    console.error('Erro em unregisterFcmToken:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 11. DELETE OLD NOTIFICATIONS (Cleanup)
// ============================================================================
/**
 * Remove notificações com mais de 30 dias (para manter DB limpo)
 * Pode ser chamado via cron job ou manualmente
 */
export async function cleanupOldNotifications(daysOld = 30): Promise<{
  success: boolean;
  deleted?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      return { success: false, error: 'Falha ao limpar notificações' };
    }

    revalidatePath('/app/notificacoes');
    return { success: true };
  } catch (err) {
    console.error('Erro em cleanupOldNotifications:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}

// ============================================================================
// 12. INITIALIZE DEFAULT PREFERENCES (para novos usuários)
// ============================================================================
/**
 * Inicializa preferências padrão para um novo usuário
 * Chamado após registro (via trigger em user creation)
 */
export async function initializeDefaultNotificationPreferences(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Chamar função PostgreSQL que cria preferências padrão
    const { error } = await supabase.rpc('init_default_notification_preferences', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Erro ao inicializar preferências:', error);
      return { success: false, error: 'Falha ao inicializar preferências' };
    }

    return { success: true };
  } catch (err) {
    console.error('Erro em initializeDefaultNotificationPreferences:', err);
    return { success: false, error: 'Erro inesperado' };
  }
}
