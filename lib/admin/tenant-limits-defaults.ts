/**
 * Defaults de limites para tenant NOVO.
 *
 * Espelham os DEFAULT da migration 20261001121000_tenant_limits.sql. Ficam aqui
 * para que o wizard e o banco não divirjam em silêncio — se um mudar, o teste
 * lembra de mudar o outro.
 */
export const DEFAULT_NEW_TENANT_LIMITS = {
  clients_limit_enabled: true,
  clients_limit: 25,
  patients_limit_enabled: true,
  patients_limit: 25,
  team_members_enabled: false,
  team_members_unlimited: false,
  team_members_limit: 0,
} as const;

/** Teto de segurança: um zero a mais no teclado não vira "ilimitado". */
export const MAX_TENANT_LIMIT = 100_000;
