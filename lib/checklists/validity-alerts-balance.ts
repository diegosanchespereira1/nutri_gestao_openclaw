import type {
  ChecklistValidityAlert,
  ChecklistValidityAlertStatus,
} from "@/lib/types/checklist-validity-alerts";

/** Vencidos até 1 ano atrás. */
export const VALIDITY_ALERTS_PAST_DAYS = 365;

/** Validades futuras consideradas «a vencer» (além dos 7 dias urgentes). */
export const VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT = 90;

/** Limite por defeito — espaço para vencidos e a vencer após balanceamento. */
export const VALIDITY_ALERTS_LIMIT_DEFAULT = 48;

/** Limite das páginas de lista e das contagens do Dashboard. */
export const VALIDITY_ALERTS_LIST_LIMIT = 400;

export type ValidityAlertWindow = {
  withinDays: number;
  pastDays: number;
};

/**
 * Janela da query: lista de um só estado não deve gastar o limite no outro.
 * Vencidos = último ano até ontem. A vencer = hoje até 90 dias.
 */
export function resolveValidityAlertWindow(options?: {
  status?: ChecklistValidityAlertStatus;
  withinDays?: number;
  pastDays?: number;
}): ValidityAlertWindow {
  const status = options?.status;
  return {
    withinDays:
      options?.withinDays ??
      (status === "vencido" ? 0 : VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT),
    pastDays:
      options?.pastDays ??
      (status === "proximo" ? 0 : VALIDITY_ALERTS_PAST_DAYS),
  };
}

export function filterValidityAlertsByStatus(
  alerts: ChecklistValidityAlert[],
  status: ChecklistValidityAlertStatus,
): ChecklistValidityAlert[] {
  return alerts.filter((alert) => alert.status === status);
}

export function countValidityAlertsByStatus(alerts: ChecklistValidityAlert[]): {
  vencidos: number;
  proximos: number;
} {
  let vencidos = 0;
  let proximos = 0;
  for (const alert of alerts) {
    if (alert.status === "vencido") vencidos += 1;
    else proximos += 1;
  }
  return { vencidos, proximos };
}

/**
 * Garante representação de vencidos e a vencer quando o limite corta a lista.
 * Sem isto, ordenar vencidos primeiro + LIMIT 8 esvazia o filtro «A vencer».
 */
export function balanceValidityAlerts(
  alerts: ChecklistValidityAlert[],
  limit: number,
): ChecklistValidityAlert[] {
  if (alerts.length <= limit) return alerts;

  const vencidos = alerts.filter((a) => a.status === "vencido");
  const proximos = alerts.filter((a) => a.status === "proximo");
  const half = Math.max(1, Math.floor(limit / 2));

  const picked: ChecklistValidityAlert[] = [];
  const used = new Set<string>();

  const push = (alert: ChecklistValidityAlert) => {
    if (used.has(alert.responseId)) return;
    used.add(alert.responseId);
    picked.push(alert);
  };

  for (const alert of vencidos.slice(0, half)) {
    push(alert);
  }
  for (const alert of proximos.slice(0, half)) {
    push(alert);
  }

  const byUrgency = [...alerts].sort((a, b) => {
    if (a.status !== b.status) return a.status === "vencido" ? -1 : 1;
    return a.validUntil.localeCompare(b.validUntil);
  });

  for (const alert of byUrgency) {
    if (picked.length >= limit) break;
    push(alert);
  }

  picked.sort((a, b) => {
    if (a.status !== b.status) return a.status === "vencido" ? -1 : 1;
    return a.validUntil.localeCompare(b.validUntil);
  });

  return picked.slice(0, Math.max(1, limit));
}
