const ATTENTION_HORIZON_DAYS = 7;

/** Crítico para o bloco «Checklists em alerta»: vencido ou vence em até 7 dias. */
export function isAttentionNow(daysToDue: number): boolean {
  return daysToDue <= ATTENTION_HORIZON_DAYS;
}

export function isOverdueDays(daysToDue: number): boolean {
  return daysToDue < 0;
}
