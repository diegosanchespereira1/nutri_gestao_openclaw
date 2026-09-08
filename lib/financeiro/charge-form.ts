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
  client: "Cliente inválido ou sem permissão.",
  save: "Não foi possível salvar. Tente novamente.",
};

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
