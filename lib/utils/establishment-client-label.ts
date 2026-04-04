import type { EstablishmentWithClientNames } from "@/lib/types/establishments";

export function establishmentClientLabel(
  row: EstablishmentWithClientNames,
): string {
  const t = row.clients.trade_name?.trim();
  return t && t.length > 0 ? t : row.clients.legal_name;
}
