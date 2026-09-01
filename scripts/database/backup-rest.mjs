#!/usr/bin/env node
/**
 * backup-rest.mjs — Snapshot de DADOS do Supabase cloud via PostgREST + Auth Admin API.
 *
 * Existe porque o caminho normal (scripts/database/backup.sh com pg_dump) exige a senha do
 * banco e o cliente libpq. Este aqui precisa apenas de `node` e da SERVICE_ROLE key.
 *
 * ⚠️  NÃO substitui o pg_dump. O que ESTE script salva:
 *       ✓ todas as linhas das tabelas expostas no schema public
 *       ✓ a lista de usuários do Auth (sem hash de senha — o GoTrue não expõe)
 *       ✓ o inventário do Storage (nomes, tamanhos) — não os binários
 *     O que NÃO salva:
 *       ✗ DDL (mas o schema é reproduzível de supabase/migrations/)
 *       ✗ roles/grants, sequences, funções e policies
 *       ✗ os arquivos do Storage
 *       ✗ senhas dos usuários — num restore, todos precisam redefinir
 *
 * Uso:
 *   SB_URL=https://<ref>.supabase.co SB_KEY=<service_role> node scripts/database/backup-rest.mjs
 *   # ou:  node scripts/database/backup-rest.mjs --env-file caminho/para/.env
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const PAGE = 1000;
const argEnv = process.argv.indexOf('--env-file');
let URL_ = process.env.SB_URL, KEY = process.env.SB_KEY;
if (argEnv > -1) {
  const txt = fs.readFileSync(process.argv[argEnv + 1], 'utf8');
  const pick = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
  URL_ ||= pick('NEXT_PUBLIC_SUPABASE_URL'); KEY ||= pick('SUPABASE_SERVICE_ROLE_KEY');
}
if (!URL_ || !KEY) { console.error('Faltam SB_URL / SB_KEY (ou --env-file).'); process.exit(1); }
URL_ = URL_.replace(/\/$/, '');

const REF = URL_.match(/https:\/\/([^.]+)\./)?.[1] ?? 'unknown';
const TS = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const DEST = path.resolve(process.cwd(), 'backups', REF, `${TS}-rest`);
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const log = (m) => console.log(`  ${m}`);
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const die = (m) => { console.error(`  \x1b[31m✗\x1b[0m ${m}`); fs.rmSync(DEST, { recursive: true, force: true }); process.exit(1); };

// Views: exportadas por completude, mas não restauráveis como tabela.
const VIEWS = new Set(['admin_tenant_cockpit', 'admin_platform_metrics', 'checklist_establishment_recent']);

fs.mkdirSync(DEST, { recursive: true });
console.log(`\nProjeto : ${REF}\nDestino : ${DEST}\n`);

// ── 1. Tabelas ──────────────────────────────────────────────────────────────
const spec = await (await fetch(`${URL_}/rest/v1/`, { headers: H })).json();
const tables = Object.keys(spec.definitions || {}).sort();
if (!tables.length) die('O schema exposto veio vazio — verifique a SERVICE_ROLE key.');
log(`${tables.length} tabelas/views no schema exposto`);

const counts = {};
for (const t of tables) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=*&limit=${PAGE}&offset=${from}`, { headers: H });
    if (!r.ok) { warn(`${t}: HTTP ${r.status} — pulado`); counts[t] = -1; break; }
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  if (counts[t] === -1) continue;
  counts[t] = rows.length;
  const ndjson = rows.map((o) => JSON.stringify(o)).join('\n') + (rows.length ? '\n' : '');
  fs.writeFileSync(path.join(DEST, `${t}.ndjson.gz`), zlib.gzipSync(Buffer.from(ndjson, 'utf8')));
}
const withData = Object.values(counts).filter((n) => n > 0).length;
const totalRows = Object.values(counts).reduce((a, b) => a + Math.max(b, 0), 0);
ok(`${withData} tabelas com dados, ${totalRows} linhas`);

// ── 2. Usuários do Auth ─────────────────────────────────────────────────────
let users = [];
for (let page = 1; ; page++) {
  const r = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H });
  if (!r.ok) { warn(`auth users: HTTP ${r.status}`); break; }
  const j = await r.json();
  const batch = j.users ?? [];
  users.push(...batch);
  if (batch.length < 200) break;
}
fs.writeFileSync(path.join(DEST, 'auth_users.json.gz'), zlib.gzipSync(Buffer.from(JSON.stringify(users, null, 2))));
ok(`${users.length} usuários do Auth (sem hash de senha)`);

// ── 3. Inventário do Storage ────────────────────────────────────────────────
let storage = {}, storageBytes = 0, storageFiles = 0;
const rb = await fetch(`${URL_}/storage/v1/bucket`, { headers: H });
if (rb.ok) {
  for (const b of await rb.json()) {
    const objs = [];
    const walk = async (prefix) => {
      for (let offset = 0; ; offset += 100) {
        const r = await fetch(`${URL_}/storage/v1/object/list/${b.name}`, {
          method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
        });
        if (!r.ok) break;
        const items = await r.json();
        for (const it of items) {
          if (it.id === null) await walk(`${prefix}${it.name}/`);
          else { objs.push({ name: prefix + it.name, size: it.metadata?.size ?? 0, updated_at: it.updated_at }); storageBytes += it.metadata?.size ?? 0; storageFiles++; }
        }
        if (items.length < 100) break;
      }
    };
    await walk('');
    storage[b.name] = objs;
  }
  fs.writeFileSync(path.join(DEST, 'storage_inventory.json.gz'), zlib.gzipSync(Buffer.from(JSON.stringify(storage, null, 2))));
  ok(`${storageFiles} arquivos no Storage (${(storageBytes / 1048576).toFixed(1)} MB) — inventário, não os binários`);
} else warn(`storage: HTTP ${rb.status}`);

// ── 4. Verificação: snapshot vazio não é backup ─────────────────────────────
for (const t of ['profiles', 'clients', 'patients', 'team_members']) {
  if (!counts[t]) die(`'${t}' veio com 0 linhas — snapshot inválido, removido.`);
}
if (!users.length) warn('Nenhum usuário do Auth exportado — confira a SERVICE_ROLE key.');

// ── 5. Manifest + checksums ─────────────────────────────────────────────────
fs.writeFileSync(path.join(DEST, 'manifest.json'), JSON.stringify({
  kind: 'rest-data-snapshot',
  project_ref: REF,
  created_at: new Date().toISOString(),
  note: 'Somente dados. Schema vem de supabase/migrations/. Sem roles, sem senhas, sem binários do Storage.',
  tables_with_data: withData, total_rows: totalRows,
  auth_users: users.length,
  storage_files: storageFiles, storage_bytes: storageBytes,
  views_exported_not_restorable: [...VIEWS].filter((v) => counts[v] > 0),
  counts,
}, null, 2));

const sums = fs.readdirSync(DEST).filter((f) => f.endsWith('.gz')).sort()
  .map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(DEST, f))).digest('hex')}  ${f}`).join('\n');
fs.writeFileSync(path.join(DEST, 'SHA256SUMS'), sums + '\n');
ok('manifest.json + SHA256SUMS');

const size = fs.readdirSync(DEST).reduce((a, f) => a + fs.statSync(path.join(DEST, f)).size, 0);
console.log(`\n\x1b[32mSnapshot concluído:\x1b[0m ${DEST} (${(size / 1048576).toFixed(2)} MB)\n`);
