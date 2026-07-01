import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";

/** Vencidos até 1 ano atrás. */
export const VALIDITY_ALERTS_PAST_DAYS = 365;

/** Validades futuras consideradas «a vencer» (além dos 7 dias urgentes). */
export const VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT = 90;

/** Limite por defeito — espaço para vencidos e a vencer após balanceamento. */
export const VALIDITY_ALERTS_LIMIT_DEFAULT = 48;

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
