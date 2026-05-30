import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

function normalizeEmbed<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function clientDisplayName(
  clients:
    | { trade_name?: string | null; legal_name?: string | null }
    | null
    | undefined,
): string | null {
  if (!clients) return null;
  const trade = clients.trade_name?.trim();
  if (trade) return trade;
  const legal = clients.legal_name?.trim();
  return legal || null;
}

/** Nome do estabelecimento ou paciente (null se indisponível no embed). */
export function visitTargetName(
  row: ScheduledVisitWithTargets,
): string | null {
  if (row.target_type === "establishment") {
    const est = normalizeEmbed(row.establishments);
    const name = est?.name?.trim();
    if (name) return name;
    return clientDisplayName(est?.clients ?? null);
  }
  if (row.target_type === "patient") {
    const pat = normalizeEmbed(row.patients);
    const name = pat?.full_name?.trim();
    return name || null;
  }
  return null;
}

export function visitDisplayTitle(row: ScheduledVisitWithTargets): string {
  const name = visitTargetName(row);
  if (name) return name;
  return row.target_type === "establishment" ? "Estabelecimento" : "Paciente";
}
