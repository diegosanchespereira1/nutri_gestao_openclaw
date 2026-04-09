/**
 * Página: Preferências de Notificação
 * Rota: /app/configuracoes/notificacoes
 * Story: 11.6
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PreferencesPanel } from '@/components/notifications/preferences-panel';

export const metadata = {
  title: 'Preferências de Notificação | NutriGestão',
  description: 'Gerencie suas preferências de notificação',
};

export default async function NotificacoesPreferencesPage() {
  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PreferencesPanel />
    </div>
  );
}
