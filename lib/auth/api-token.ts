/** Validade padrão de tokens API do portal externo (365 dias). */
export const DEFAULT_API_TOKEN_TTL_DAYS = 365;

export type ApiTokenRow = {
  id: string;
  owner_user_id: string;
  token_hash: string;
  revoked_at: string | null;
  expires_at: string | null;
};

export function defaultApiTokenExpiresAt(from = new Date()): string {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + DEFAULT_API_TOKEN_TTL_DAYS);
  return expires.toISOString();
}

/** Rejeita tokens revogados ou expirados. */
export function isApiTokenActive(row: Pick<ApiTokenRow, "revoked_at" | "expires_at">): boolean {
  if (row.revoked_at) return false;
  if (!row.expires_at) return false;
  return new Date(row.expires_at) > new Date();
}
