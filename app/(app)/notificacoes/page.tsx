/**
 * Página: Centro de Notificações
 * Rota: /app/notificacoes
 * Story: 11.6
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/notification-center';

export const metadata = {
  title: 'Notificações | NutriGestão',
  description: 'Centro de notificações e alertas',
};

export default async function NotificacoesPage() {
  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationCenter />
    </div>
  );
}
