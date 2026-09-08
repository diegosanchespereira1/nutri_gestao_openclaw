export type ChargeMutationSource = "financeiro" | "client";

export function parseChargeMutationSource(
  raw: string | null | undefined,
): ChargeMutationSource {
  return raw === "client" ? "client" : "financeiro";
}

/** Só aceita o id se ele existir na lista do workspace. */
export function resolveDefaultChargeClientId(
  defaultClientId: string | null | undefined,
  clientIds: readonly string[],
): string {
  if (!defaultClientId) return "";
  return clientIds.includes(defaultClientId) ? defaultClientId : "";
}

export const CHARGE_FORM_ERR_MESSAGES: Record<string, string> = {
  invalid: "Preencha cliente, categoria, valor válido e data de vencimento.",
  recurrence:
    "Se for recorrente, a data de término deve ficar vazia ou ser igual ou posterior ao vencimento.",
  client: "Cliente inválido ou sem permissão.",
  save: "Não foi possível salvar. Tente novamente.",
};

export function parseChargeDueDate(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

export function parseChargeRecurring(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "sim" || s === "on";
}

export type ChargeRecurrence =
  | { ok: true; isRecurring: false; endsOn: null }
  | { ok: true; isRecurring: true; endsOn: string | null }
  | { ok: false };

export function resolveChargeRecurrence(options: {
  dueDate: string;
  isRecurring: boolean;
  endsOnRaw: string | null | undefined;
}): ChargeRecurrence {
  const { dueDate, isRecurring, endsOnRaw } = options;
  const endsTrimmed = String(endsOnRaw ?? "").trim();

  if (!isRecurring) {
    return { ok: true, isRecurring: false, endsOn: null };
  }

  if (endsTrimmed.length === 0) {
    return { ok: true, isRecurring: true, endsOn: null };
  }

  const endsOn = parseChargeDueDate(endsTrimmed);
  if (!endsOn || endsOn < dueDate) {
    return { ok: false };
  }

  return { ok: true, isRecurring: true, endsOn };
}

export function chargeRecurrenceLabel(options: {
  isRecurring: boolean;
  endsOn: string | null;
}): string | null {
  if (!options.isRecurring) return null;
  if (!options.endsOn) return "Recorrente";
  const [y, m, d] = options.endsOn.split("-");
  if (!y || !m || !d) return "Recorrente";
  return `Recorrente até ${d}/${m}/${y}`;
}

export function chargeFormErrorMessage(
  err: string | null | undefined,
): string | null {
  if (!err) return null;
  return CHARGE_FORM_ERR_MESSAGES[err] ?? null;
}

export function chargeMutationPath(
  source: ChargeMutationSource,
  clientId: string | null,
  err?: string,
): string {
  if (source === "client" && clientId) {
    const p = new URLSearchParams();
    p.set("tab", "financeiro");
    if (err) p.set("chargeErr", err);
    return `/clientes/${clientId}/editar?${p.toString()}`;
  }
  const p = new URLSearchParams();
  p.set("tab", "operacoes");
  if (err) p.set("err", err);
  return `/financeiro?${p.toString()}`;
}
