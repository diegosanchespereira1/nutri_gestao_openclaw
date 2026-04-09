'use client';

/**
 * Modal para editar uma preferência de notificação individual
 * Permite: enable/disable, push/email toggles, quiet hours, urgency
 */

import { useState } from 'react';
import {
  NotificationPreference,
  NotificationEventType,
  NOTIFICATION_EVENT_LABELS,
  URGENCY_LABELS,
} from '@/lib/types/notification';
import { updateNotificationPreference } from '@/lib/actions/notification';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface PreferenceEditModalProps {
  preference: NotificationPreference;
  onClose: () => void;
  onUpdate: (updated: NotificationPreference) => void;
}

export function PreferenceEditModal({
  preference,
  onClose,
  onUpdate,
}: PreferenceEditModalProps) {
  const [enabled, setEnabled] = useState(preference.enabled);
  const [pushEnabled, setPushEnabled] = useState(preference.push_enabled);
  const [emailEnabled, setEmailEnabled] = useState(preference.email_enabled);
  const [urgency, setUrgency] = useState(preference.urgency_level);
  const [quietStart, setQuietStart] = useState(preference.quiet_hours_start || '22:00');
  const [quietEnd, setQuietEnd] = useState(preference.quiet_hours_end || '08:00');
  const [useQuietHours, setUseQuietHours] = useState(!!preference.quiet_hours_start);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventLabel = NOTIFICATION_EVENT_LABELS[preference.event_type as NotificationEventType];

  const handleSave = async () => {
    if (!enabled && !pushEnabled && !emailEnabled) {
      setError('Você deve habilitar pelo menos um canal ou desabilitar completamente');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updateNotificationPreference(
      preference.event_type as NotificationEventType,
      {
        enabled,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        urgency_level: urgency as 1 | 2 | 3,
        quiet_hours_start: useQuietHours ? quietStart : null,
        quiet_hours_end: useQuietHours ? quietEnd : null,
      }
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Erro ao salvar');
    } else if (result.preference) {
      onUpdate(result.preference);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências: {eventLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enable Global */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked as boolean)}
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              Habilitar notificações para este evento
            </Label>
          </div>

          {enabled && (
            <>
              {/* Push & Email Toggles */}
              <div className="bg-gray-50 p-3 rounded space-y-2">
                <p className="text-sm font-medium text-gray-900">Canais</p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="push"
                    checked={pushEnabled}
                    onCheckedChange={(checked) => setPushEnabled(checked as boolean)}
                  />
                  <Label htmlFor="push" className="cursor-pointer text-sm">
                    Notificação push (browser)
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="email"
                    checked={emailEnabled}
                    onCheckedChange={(checked) => setEmailEnabled(checked as boolean)}
                  />
                  <Label htmlFor="email" className="cursor-pointer text-sm">
                    Notificação por email
                  </Label>
                </div>
              </div>

              {/* Urgency Level */}
              <fieldset className="space-y-2 border-0">
                <legend className="text-sm font-medium">
                  Nível de Urgência: <span className="font-semibold">{URGENCY_LABELS[urgency as 1 | 2 | 3]}</span>
                </legend>
                <div className="space-y-2 ml-0">
                  {[1, 2, 3].map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`urgency-${level}`}
                        name="urgency"
                        value={level}
                        checked={urgency === level}
                        onChange={(e) => setUrgency(parseInt(e.target.value) as 1 | 2 | 3)}
                        className="cursor-pointer"
                      />
                      <Label htmlFor={`urgency-${level}`} className="cursor-pointer font-normal">
                        {URGENCY_LABELS[level as 1 | 2 | 3]}
                        {level === 3 && ' (ignora quiet hours)'}
                      </Label>
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* Quiet Hours */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="quietHours"
                    checked={useQuietHours}
                    onCheckedChange={(checked) => setUseQuietHours(checked as boolean)}
                  />
                  <Label htmlFor="quietHours" className="cursor-pointer text-sm font-medium">
                    Horário silencioso (não enviar entre...)
                  </Label>
                </div>

                {useQuietHours && (
                  <div className="ml-6 space-y-2 bg-gray-50 p-2 rounded">
                    <div className="flex gap-2 items-center">
                      <Label className="text-xs text-gray-600 w-16">De:</Label>
                      <Input
                        type="time"
                        value={quietStart}
                        onChange={(e) => setQuietStart(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Label className="text-xs text-gray-600 w-16">Até:</Label>
                      <Input
                        type="time"
                        value={quietEnd}
                        onChange={(e) => setQuietEnd(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    {urgency === 3 && (
                      <p className="text-xs text-yellow-600 flex gap-1">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Notificações críticas ignoram horário silencioso
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
