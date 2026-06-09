#!/usr/bin/env bash
#
# restore.sh — Restore a NutriGestão snapshot created by backup.sh.
#
# ⚠️  DESTRUCTIVE: applies roles + schema + data onto the TARGET database.
#     Always restore into a fresh / staging project first and verify before
#     pointing it at anything you care about.
#
# ── Usage ───────────────────────────────────────────────────────────────────
#   ./scripts/database/restore.sh <snapshot-dir> [--target-url <url>]
#   ./scripts/database/restore.sh backups/abwzwwazdeptvafwlhon/20260608-101500
#
# Target connection (where data is written) is resolved in this order:
#   1. --target-url <url>
#   2. $RESTORE_DB_URL
#   3. $SUPABASE_DB_URL   (⚠ same var backup.sh reads — be careful)
#   4. scripts/database/.env.backup  (auto-sourced)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.backup"

if [ -t 1 ]; then C_GREEN='\033[0;32m'; C_RED='\033[0;31m'; C_YEL='\033[0;33m'; C_OFF='\033[0m'
else C_GREEN=''; C_RED=''; C_YEL=''; C_OFF=''; fi
ok()   { printf '%b  ✓ %s%b\n' "$C_GREEN" "$*" "$C_OFF"; }
warn() { printf '%b  ! %s%b\n' "$C_YEL" "$*" "$C_OFF"; }
die()  { printf '%b  ✗ %s%b\n' "$C_RED" "$*" "$C_OFF" >&2; exit 1; }

[ $# -ge 1 ] || die "Usage: $0 <snapshot-dir> [--target-url <url>]"
SNAP="$1"; shift
TARGET_URL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --target-url) TARGET_URL="$2"; shift 2 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[ -d "$SNAP" ] || die "Snapshot dir not found: $SNAP"
command -v psql >/dev/null 2>&1 || die "psql not found. Install: brew install libpq"

[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
: "${TARGET_URL:=${RESTORE_DB_URL:-${SUPABASE_DB_URL:-}}}"
[ -n "$TARGET_URL" ] || die "No target. Pass --target-url, or set RESTORE_DB_URL / SUPABASE_DB_URL."

# Verify integrity before touching the target.
if [ -f "${SNAP}/SHA256SUMS" ]; then
  ( cd "$SNAP" && shasum -a 256 -c SHA256SUMS >/dev/null 2>&1 ) \
    && ok "Checksums verified" || die "Checksum mismatch — snapshot is corrupt, aborting."
else
  warn "No SHA256SUMS in snapshot; skipping integrity check."
fi

# Find the restore bundle (prefer combined restore.sql).
BUNDLE=""
for f in restore.sql restore.sql.gz; do [ -f "${SNAP}/${f}" ] && { BUNDLE="${SNAP}/${f}"; break; }; done
[ -n "$BUNDLE" ] || die "No restore.sql(.gz) found in $SNAP"

SAFE_URL="$(printf '%s' "$TARGET_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1********@#')"
printf '%b⚠  About to RESTORE %s\n   ONTO %s%b\n' "$C_YEL" "$SNAP" "$SAFE_URL" "$C_OFF"
printf 'Type the word RESTORE to proceed: '
read -r CONFIRM
[ "$CONFIRM" = "RESTORE" ] || die "Aborted."

ok "Restoring …"
if [[ "$BUNDLE" == *.gz ]]; then
  gunzip -c "$BUNDLE" | psql "$TARGET_URL" -v ON_ERROR_STOP=1
else
  psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$BUNDLE"
fi
ok "Restore finished."
