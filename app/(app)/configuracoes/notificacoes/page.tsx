/**
 * Página: Preferências de Notificação
 * Rota: /app/configuracoes/notificacoes
 * Story: 11.6
 */

import { redirect } from 'next/navigation';
import { PreferencesPanel } from '@/components/notifications/preferences-panel';
import { getServerContext } from '@/lib/supabase/get-server-user';

export const metadata = {
  title: 'Preferências de Notificação | NutriGestão',
  description: 'Gerencie suas preferências de notificação',
};

export default async function NotificacoesPreferencesPage() {
  const { user } = await getServerContext();
  if (!user) redirect('/login');

  return (
    <div className="container mx-auto px-4 py-8">
      <PreferencesPanel />
    </div>
  );
}
