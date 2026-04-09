'use client';

/**
 * Painel de gerenciamento de preferências de notificação
 * Lista todas as preferências e permite edição individual
 */

import { useState, useEffect } from 'react';
import { NotificationPreference } from '@/lib/types/notification';
import { getNotificationPreferences } from '@/lib/actions/notification';
import { PreferenceRow } from './preference-row';

interface PreferencesPanelProps {
  className?: string;
}

export function PreferencesPanel({ className }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);

    const result = await getNotificationPreferences();

    if (!result.success) {
      setError(result.error || 'Erro ao carregar preferências');
    } else {
      setPreferences(result.preferences || []);
    }

    setLoading(false);
  };

  const handlePreferenceUpdate = (updated: NotificationPreference) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-3" role="status" aria-live="polite">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Preferências de Notificação</h1>
        <p className="text-gray-600">
          Controle quais notificações você deseja receber, como e quando
        </p>
      </div>

      {preferences.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma preferência encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {preferences.map((preference) => (
            <PreferenceRow
              key={preference.id}
              preference={preference}
              onUpdate={handlePreferenceUpdate}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Informações de Conformidade LGPD</h3>
        <p className="text-sm text-blue-700 mb-2">
          Você pode revogar notificações a qualquer momento. Todas as mudanças em suas preferências
          são registadas para auditoria e conformidade.
        </p>
        <p className="text-sm text-blue-700">
          Notificações críticas (Criticalidade 3) ignoram o horário silencioso para garantir que
          você não perca alertas importantes.
        </p>
      </div>
    </div>
  );
}
