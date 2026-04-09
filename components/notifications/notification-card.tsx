'use client';

/**
 * Card de notificação individual para exibição em lista
 * Mostra: tipo (ícone), título, corpo, data, badge "Nova"
 */

import { Notification, NOTIFICATION_EVENT_LABELS } from '@/lib/types/notification';
import { formatRelativeTime } from '@/lib/utils/date';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { markNotificationAsRead } from '@/lib/actions/notification';

// Ícones por tipo de evento
const EVENT_ICONS: Record<string, string> = {
  visit_scheduled: '📅',
  visit_reminder: '⏰',
  financial_alert: '💰',
  portaria_updated: '⚠️',
  checklist_expiring: '🔔',
  consent_revoked: '🛑',
  patient_new: '👤',
  dsar_request_completed: '📄',
};

interface NotificationCardProps {
  notification: Notification;
  onDetailClick?: (notification: Notification) => void;
}

export function NotificationCard({ notification, onDetailClick }: NotificationCardProps) {
  const isUnread = !notification.read_at;
  const eventLabel = NOTIFICATION_EVENT_LABELS[notification.event_type];
  const icon = EVENT_ICONS[notification.event_type] || '📬';

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUnread) return;

    const result = await markNotificationAsRead(notification.id);
    if (!result.success) {
      console.error('Erro ao marcar como lido:', result.error);
    }
  };

  return (
    <button
      onClick={() => onDetailClick?.(notification)}
      className={`w-full text-left p-4 border rounded-lg transition-colors ${
        isUnread ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex gap-3">
        {/* Ícone do tipo */}
        <div className="text-2xl flex-shrink-0 mt-1">{icon}</div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="font-semibold text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-500">{eventLabel}</p>
            </div>
            {isUnread && <Badge variant="default">Nova</Badge>}
          </div>

          {/* Corpo truncado */}
          <p className="text-sm text-gray-700 line-clamp-2 mb-2">{notification.body}</p>

          {/* Rodapé com data e ação */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{formatRelativeTime(notification.created_at)}</span>
            {isUnread && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={handleMarkAsRead}
              >
                <Check className="w-4 h-4 mr-1" />
                Marcar como lido
              </Button>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
