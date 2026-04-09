/** Estado de bloqueio LGPD a partir da linha em `profiles` (Story 11.7). */

export type LgpdProfileRow = {
  lgpd_blocked_at: string | null;
  lgpd_unblocked_at: string | null;
  lgpd_cancel_token_hash: string | null;
  lgpd_cancel_token_expires_at: string | null;
};

export function isProfileLgpdActivelyBlocked(row: LgpdProfileRow | null): boolean {
  if (!row) return false;
  return row.lgpd_blocked_at != null && row.lgpd_unblocked_at == null;
}

export function isLgpdClosurePending(row: LgpdProfileRow | null): boolean {
  if (!row) return false;
  if (isProfileLgpdActivelyBlocked(row)) return false;
  return (
    row.lgpd_cancel_token_hash != null &&
    row.lgpd_cancel_token_expires_at != null &&
    new Date(row.lgpd_cancel_token_expires_at) > new Date()
  );
}
