#!/usr/bin/env bash
#
# backup.sh — Full disaster-recovery backup of the NutriGestão Supabase project.
#
# Produces a timestamped, self-contained snapshot of the cloud database:
#   - roles.sql   (database roles / grants, via `supabase db dump --role-only`)
#   - schema.sql  (DDL: schemas, tables, functions, RLS policies, triggers …)
#   - data.sql    (all table data, via `supabase db dump --data-only`)
#   - restore.sql (roles + schema + data concatenated → one-shot restore)
#   - manifest.json + SHA256SUMS (integrity + provenance)
# Each .sql is gzipped. Old snapshots are pruned by RETENTION_DAYS.
#
# We use native pg_dump/pg_dumpall (NOT `supabase db dump`) on purpose: the
# Supabase CLI runs pg_dump inside a Docker container, so it needs Docker
# Desktop running. Native pg_dump talks straight to the cloud DB — no daemon,
# fewer moving parts, which is what you want for a recovery tool.
#
# ── Credentials (never hard-coded) ──────────────────────────────────────────
# Provide ONE of the following (checked in this order):
#   1. $SUPABASE_DB_URL  — full Postgres connection string (recommended).
#         Copy it from: Supabase Dashboard → Connect → "Session pooler" (IPv4)
#         e.g. postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres
#   2. $SUPABASE_DB_PASSWORD — just the DB password; a direct-connection URL is
#         built as postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
#         (works only where IPv6 / direct connection is reachable).
#
# You can keep these in scripts/database/.env.backup (gitignored) — it is
# auto-sourced if present.
#
# ── Usage ───────────────────────────────────────────────────────────────────
#   ./scripts/database/backup.sh            # backup with defaults
#   PROJECT_REF=xxxx ./scripts/database/backup.sh
#   RETENTION_DAYS=30 ./scripts/database/backup.sh
#
set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────────
PROJECT_REF="${PROJECT_REF:-abwzwwazdeptvafwlhon}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${PROJECT_ROOT}/backups}"
ENV_FILE="${SCRIPT_DIR}/.env.backup"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${PROJECT_REF}/${TIMESTAMP}"

# ── Logging helpers ─────────────────────────────────────────────────────────
if [ -t 1 ]; then C_BLUE='\033[0;34m'; C_GREEN='\033[0;32m'; C_RED='\033[0;31m'; C_YEL='\033[0;33m'; C_OFF='\033[0m'
else C_BLUE=''; C_GREEN=''; C_RED=''; C_YEL=''; C_OFF=''; fi
log()  { printf '%b[%s]%b %s\n' "$C_BLUE" "$(date +%H:%M:%S)" "$C_OFF" "$*"; }
ok()   { printf '%b  ✓ %s%b\n' "$C_GREEN" "$*" "$C_OFF"; }
warn() { printf '%b  ! %s%b\n' "$C_YEL" "$*" "$C_OFF"; }
die()  { printf '%b  ✗ %s%b\n' "$C_RED" "$*" "$C_OFF" >&2; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────────────────
command -v pg_dump    >/dev/null 2>&1 || die "pg_dump not found. Install: brew install libpq"
command -v pg_dumpall >/dev/null 2>&1 || die "pg_dumpall not found. Install: brew install libpq"

[ -f "$ENV_FILE" ] && { log "Loading credentials from ${ENV_FILE}"; set -a; . "$ENV_FILE"; set +a; }

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  DB_URL="$SUPABASE_DB_URL"
elif [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
  DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
else
  die "No credentials. Set SUPABASE_DB_URL (recommended) or SUPABASE_DB_PASSWORD.
     See the header of this script, or create ${ENV_FILE}"
fi

# Mask the password when echoing the target.
SAFE_URL="$(printf '%s' "$DB_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1********@#')"

# ── Run ─────────────────────────────────────────────────────────────────────
log "Backup target : ${SAFE_URL}"
log "Project ref   : ${PROJECT_REF}"
log "Destination   : ${DEST}"
mkdir -p "$DEST"

# Roles are best-effort: --no-role-passwords avoids needing superuser on pg_authid.
log "Dumping roles …"
if pg_dumpall --dbname="$DB_URL" --roles-only --no-role-passwords > "${DEST}/roles.sql" 2>"${DEST}/.roles.err"; then
  ok "roles → roles.sql ($(du -h "${DEST}/roles.sql" | cut -f1))"
  rm -f "${DEST}/.roles.err"
else
  warn "Could not dump roles (non-fatal): $(tail -1 "${DEST}/.roles.err" 2>/dev/null)"
  : > "${DEST}/roles.sql"; rm -f "${DEST}/.roles.err"
fi

# Schema: full DDL, owners + privileges kept so RLS grants survive intact.
log "Dumping schema …"
pg_dump --dbname="$DB_URL" --schema-only > "${DEST}/schema.sql" \
  || die "Failed to dump schema. Verify the connection string is reachable (try the Session pooler URL, port 5432)."
ok "schema → schema.sql ($(du -h "${DEST}/schema.sql" | cut -f1))"

# Data: all table data. pg_dump emits tables in dependency order.
log "Dumping data …"
pg_dump --dbname="$DB_URL" --data-only > "${DEST}/data.sql" \
  || die "Failed to dump data."
ok "data → data.sql ($(du -h "${DEST}/data.sql" | cut -f1))"

# One-shot restore file: roles → schema → data, in order.
log "Building combined restore.sql …"
{
  printf -- '-- NutriGestão restore bundle — %s — project %s\n' "$TIMESTAMP" "$PROJECT_REF"
  printf -- '-- Order matters: roles, then schema, then data.\n\n'
  printf -- '\\echo Restoring roles…\n';  cat "${DEST}/roles.sql"
  printf -- '\n\\echo Restoring schema…\n'; cat "${DEST}/schema.sql"
  printf -- '\n\\echo Restoring data…\n';   cat "${DEST}/data.sql"
} > "${DEST}/restore.sql"
ok "restore.sql ($(du -h "${DEST}/restore.sql" | cut -f1))"

# ── Integrity & provenance ──────────────────────────────────────────────────
log "Writing checksums + manifest …"
( cd "$DEST" && shasum -a 256 ./*.sql > SHA256SUMS )

ROW_NOTE="$(grep -c '^INSERT INTO\|^COPY ' "${DEST}/data.sql" 2>/dev/null || echo 0)"
cat > "${DEST}/manifest.json" <<JSON
{
  "project_ref": "${PROJECT_REF}",
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "created_by": "$(whoami)@$(hostname)",
  "pg_dump": "$(pg_dump --version 2>/dev/null | head -1)",
  "files": ["roles.sql", "schema.sql", "data.sql", "restore.sql"],
  "data_statements": ${ROW_NOTE},
  "retention_days": ${RETENTION_DAYS}
}
JSON
ok "manifest.json + SHA256SUMS"

# ── Compress the .sql files (keep manifest + checksums plain) ────────────────
log "Compressing dumps …"
gzip -f "${DEST}"/*.sql
ok "Gzipped $(ls "${DEST}"/*.sql.gz | wc -l | tr -d ' ') files"

TOTAL_SIZE="$(du -sh "$DEST" | cut -f1)"
ok "Snapshot complete: ${DEST} (${TOTAL_SIZE})"

# ── Retention: prune snapshots older than RETENTION_DAYS ────────────────────
if [ "${RETENTION_DAYS}" -gt 0 ]; then
  log "Pruning snapshots older than ${RETENTION_DAYS} days …"
  PRUNED=0
  while IFS= read -r old; do
    [ -z "$old" ] && continue
    rm -rf "$old"; warn "Removed old snapshot: $(basename "$old")"; PRUNED=$((PRUNED+1))
  done < <(find "${BACKUP_ROOT}/${PROJECT_REF}" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" 2>/dev/null)
  [ "$PRUNED" -eq 0 ] && ok "Nothing to prune" || ok "Pruned ${PRUNED} old snapshot(s)"
fi

printf '\n%bDone.%b Latest backup: %s\n' "$C_GREEN" "$C_OFF" "$DEST"
printf 'Restore with: ./scripts/database/restore.sh %s\n' "$DEST"
