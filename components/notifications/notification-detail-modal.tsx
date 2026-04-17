'use client';

/**
 * Modal com detalhes completos de uma notificação
 * Exibe: título, corpo, contexto (data JSON), ações
 */

import { Notification, NOTIFICATION_EVENT_LABELS } from '@/lib/types/notification';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

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

interface NotificationDetailModalProps {
  notification: Notification;
  onClose: () => void;
  onRefresh?: () => void;
}

export function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const eventLabel = NOTIFICATION_EVENT_LABELS[notification.event_type];
  const icon = EVENT_ICONS[notification.event_type] || '📬';
  const isUnread = !notification.read_at;

  const statusColor =
    notification.status === 'sent'
      ? 'bg-green-100 text-green-800'
      : notification.status === 'failed'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            {notification.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo e Status */}
          <div className="flex gap-2 flex-wrap">
            <Badge>{eventLabel}</Badge>
            <Badge className={statusColor} variant="secondary">
              {notification.status === 'sent' && '✓ Enviada'}
              {notification.status === 'pending' && '⏳ Pendente'}
              {notification.status === 'failed' && '✗ Falha'}
            </Badge>
            {isUnread && <Badge variant="default">Não lida</Badge>}
          </div>

          {/* Corpo */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Mensagem:</p>
            <p className="text-gray-900">{notification.body}</p>
          </div>

          {/* Contexto (dados JSON) */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Contexto:</p>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-3 space-y-1 text-xs text-gray-500">
            <p>Criada: {new Date(notification.created_at).toLocaleString('pt-BR')}</p>
            {notification.sent_at && (
              <p>Enviada: {new Date(notification.sent_at).toLocaleString('pt-BR')}</p>
            )}
            {notification.read_at && (
              <p>Lida: {new Date(notification.read_at).toLocaleString('pt-BR')}</p>
            )}
            {notification.error_message && (
              <p className="text-red-600 font-medium">Erro: {notification.error_message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
