import type { EstablishmentWithClientNames } from "@/lib/types/establishments";

export function establishmentClientLabel(
  row: EstablishmentWithClientNames,
): string {
  const t = row.clients.trade_name?.trim();
  return t && t.length > 0 ? t : row.clients.legal_name;
}

/** PostgREST pode devolver `establishments` como objeto ou array com um elemento. */
export function clientIdFromRecipeEstablishmentJoin(
  establishments: unknown,
): string | null {
  if (!establishments || typeof establishments !== "object") return null;
  if (Array.isArray(establishments)) {
    const first = establishments[0] as { client_id?: unknown } | undefined;
    const id = first?.client_id;
    return typeof id === "string" ? id : null;
  }
  const o = establishments as { client_id?: unknown };
  return typeof o.client_id === "string" ? o.client_id : null;
}
