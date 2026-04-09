'use client';

/**
 * Linha de preferência (uma por tipo de evento)
 * Mostra: tipo, toggles push/email, quiet hours, urgency
 * Clicável para abrir modal de edição
 */

import { useState } from 'react';
import {
  NotificationPreference,
  NotificationEventType,
  NOTIFICATION_EVENT_LABELS,
  URGENCY_LABELS,
} from '@/lib/types/notification';
import { PreferenceEditModal } from './preference-edit-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface PreferenceRowProps {
  preference: NotificationPreference;
  onUpdate?: (updated: NotificationPreference) => void;
}

export function PreferenceRow({ preference, onUpdate }: PreferenceRowProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const eventLabel = NOTIFICATION_EVENT_LABELS[preference.event_type as NotificationEventType];
  const urgencyLabel = URGENCY_LABELS[preference.urgency_level as 1 | 2 | 3];

  const hasQuietHours = preference.quiet_hours_start && preference.quiet_hours_end;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isLoading}
        className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{eventLabel}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {preference.enabled ? (
                <>
                  {preference.push_enabled && <Badge variant="outline">Push ✓</Badge>}
                  {preference.email_enabled && <Badge variant="outline">Email ✓</Badge>}
                  {!preference.push_enabled && !preference.email_enabled && (
                    <Badge variant="secondary">Desativada</Badge>
                  )}
                </>
              ) : (
                <Badge variant="secondary">Desativada</Badge>
              )}

              {hasQuietHours && (
                <Badge variant="outline">
                  Silencioso: {preference.quiet_hours_start}–{preference.quiet_hours_end}
                </Badge>
              )}

              {preference.urgency_level > 1 && (
                <Badge variant={preference.urgency_level === 3 ? 'destructive' : 'default'}>
                  {urgencyLabel}
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </button>

      {/* Modal de edição */}
      {showModal && (
        <PreferenceEditModal
          preference={preference}
          onClose={() => setShowModal(false)}
          onUpdate={(updated) => {
            onUpdate?.(updated);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
