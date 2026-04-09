'use client';

/**
 * Centro de Notificações - lista completa com filtros
 * Filtros: Tipo, Lido/Não lido, Últimos dias
 * Ações: Marcar tudo como lido, limpar histórico
 */

import { useState, useEffect } from 'react';
import { Notification, NOTIFICATION_EVENT_LABELS, NotificationEventType } from '@/lib/types/notification';
import { listNotifications, markAllNotificationsAsRead, cleanupOldNotifications } from '@/lib/actions/notification';
import { NotificationCard } from './notification-card';
import { NotificationDetailModal } from './notification-detail-modal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, CheckCheck } from 'lucide-react';

type FilterRead = 'all' | 'unread' | 'read';
type FilterDays = 7 | 14 | 30;

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterEventType, setFilterEventType] = useState<NotificationEventType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<FilterRead>('all');
  const [filterDays, setFilterDays] = useState<FilterDays>(30);

  // Modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  // Carregar notificações
  useEffect(() => {
    loadNotifications();
  }, [filterEventType, filterRead, filterDays, page]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    const result = await listNotifications(
      {
        event_type: filterEventType === 'all' ? undefined : (filterEventType as NotificationEventType),
        read: filterRead === 'all' ? undefined : filterRead === 'read',
        days: filterDays,
      },
      page,
      PAGE_SIZE
    );

    if (!result.success) {
      setError(result.error || 'Erro ao carregar notificações');
    } else {
      setNotifications(result.notifications || []);
      setTotal(result.total || 0);
    }

    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      loadNotifications();
    } else {
      setError(result.error || 'Erro ao marcar como lido');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Deseja apagar notificações com mais de 30 dias? Esta ação não pode ser desfeita.')) {
      return;
    }

    const result = await cleanupOldNotifications(30);
    if (result.success) {
      loadNotifications();
    } else {
      setError(result.error || 'Erro ao limpar');
    }
  };

  const eventTypeOptions = [
    { value: 'all', label: 'Todos os tipos' },
    ...Object.entries(NOTIFICATION_EVENT_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Notificações</h1>
          {unreadCount > 0 && <Badge variant="default">{unreadCount} novas</Badge>}
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar tudo como lido
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCleanup}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar histórico
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Select value={filterEventType} onValueChange={(value) => {
          if (value) {
            setFilterEventType(value as NotificationEventType | 'all');
            setPage(1);
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por tipo..." />
          </SelectTrigger>
          <SelectContent>
            {eventTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRead} onValueChange={(value) => {
          if (value) {
            setFilterRead(value as FilterRead);
            setPage(1);
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filterDays)} onValueChange={(value) => {
          if (value) {
            setFilterDays(parseInt(value) as FilterDays);
            setPage(1);
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por período..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Lista de notificações */}
      {!loading && (
        <>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onDetailClick={setSelectedNotification}
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onRefresh={loadNotifications}
        />
      )}
    </div>
  );
}
