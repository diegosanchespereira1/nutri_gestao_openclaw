# Supabase backup & disaster recovery — NutriGestão

Scripts to snapshot the production Supabase database (project ref
`abwzwwazdeptvafwlhon`) and restore it fast if anything goes wrong.

| File | Purpose |
|------|---------|
| `backup.sh`  | Creates a timestamped, integrity-checked snapshot under `backups/<ref>/<ts>/`. |
| `restore.sh` | Restores a snapshot onto a target database (with confirmation + checksum check). |
| `.env.backup` | **(you create, gitignored)** holds the DB connection string. |

`backups/` is gitignored — snapshots contain real data and are **never** committed.

## Requirements

- `supabase` CLI (`brew install supabase/tap/supabase`)
- `libpq` for `psql` on restore (`brew install libpq`)

## 1. One-time credential setup

Get the connection string from the Supabase Dashboard → **Connect** →
**Session pooler** (IPv4-friendly), then create `scripts/database/.env.backup`:

```bash
# scripts/database/.env.backup  (DO NOT COMMIT — already gitignored)
SUPABASE_DB_URL="postgresql://postgres.abwzwwazdeptvafwlhon:YOUR_DB_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

> Alternatively set just `SUPABASE_DB_PASSWORD=...` and the script builds a
> direct-connection URL (`db.<ref>.supabase.co`), which needs IPv6 reachability.

## 2. Run a backup

```bash
./scripts/database/backup.sh                 # default ref + 30-day retention
RETENTION_DAYS=90 ./scripts/database/backup.sh
```

Each snapshot directory contains:

- `roles.sql.gz` — roles & grants
- `schema.sql.gz` — full DDL (tables, functions, RLS, triggers, …)
- `data.sql.gz` — all table data
- `restore.sql.gz` — the three above concatenated, for one-shot restore
- `manifest.json` + `SHA256SUMS` — provenance & integrity

## 3. Restore (disaster recovery)

**Restore into a fresh / staging project first and verify before promoting.**

```bash
./scripts/database/restore.sh backups/abwzwwazdeptvafwlhon/20260608-101500 \
  --target-url "postgresql://postgres.NEWREF:PWD@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

It verifies checksums, asks you to type `RESTORE`, then applies the bundle with
`ON_ERROR_STOP=1`.

## 4. Automate (recommended)

Daily backup at 02:00 via cron:

```cron
0 2 * * * cd /Users/Diego/GIT/Nutricao_stratosTech && ./scripts/database/backup.sh >> backups/backup.log 2>&1
```

> **Offsite copy:** local snapshots survive app bugs but not a disk failure.
> Sync `backups/` to object storage (S3/R2/B2) or an external drive so a single
> machine loss can't destroy your only copy.
