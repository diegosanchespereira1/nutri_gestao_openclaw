#!/usr/bin/env node
/**
 * backup-storage.mjs — Baixa os binários do Supabase Storage para um snapshot.
 *
 * Complementa `backup-rest.mjs`, que salva apenas o inventário. Só precisa de `node`.
 *
 * Retomável: um arquivo já baixado com o mesmo tamanho é pulado. Rode quantas vezes precisar.
 *
 * Uso:
 *   node scripts/database/backup-storage.mjs --snapshot backups/<ref>/<ts>-rest \
 *     [--dest /Volumes/HD/nutrigestao-storage] \
 *     [--buckets checklist-fill-photos,profile-photos] \
 *     [--max-seconds 150] [--concurrency 8] [--dry-run]
 *
 * Credenciais: SB_URL / SB_KEY, ou --env-file docker-compose-prd.env
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(n);

const SNAP = path.resolve(arg('--snapshot') ?? '');
if (!SNAP || !fs.existsSync(SNAP)) { console.error('Informe --snapshot <dir do snapshot -rest>'); process.exit(1); }

let URL_ = process.env.SB_URL, KEY = process.env.SB_KEY;
const ef = arg('--env-file');
if (ef) {
  const txt = fs.readFileSync(ef, 'utf8');
  const pick = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
  URL_ ||= pick('NEXT_PUBLIC_SUPABASE_URL'); KEY ||= pick('SUPABASE_SERVICE_ROLE_KEY');
}
if (!URL_ || !KEY) { console.error('Faltam SB_URL / SB_KEY (ou --env-file).'); process.exit(1); }
URL_ = URL_.replace(/\/$/, '');

const DEST = path.resolve(arg('--dest') ?? path.join(SNAP, 'storage'));
const ONLY = (arg('--buckets') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_S = Number(arg('--max-seconds', '0'));
const CONC = Number(arg('--concurrency', '8'));
const DRY = flag('--dry-run');

const inv = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(SNAP, 'storage_inventory.json.gz'))));
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const mb = (b) => (b / 1048576).toFixed(1);

// Fila: só o que falta (retomável por tamanho)
const queue = [];
let already = 0, alreadyBytes = 0, totalBytes = 0;
for (const [bucket, objs] of Object.entries(inv)) {
  if (ONLY.length && !ONLY.includes(bucket)) continue;
  for (const o of objs) {
    totalBytes += o.size;
    const out = path.join(DEST, bucket, o.name);
    if (fs.existsSync(out) && fs.statSync(out).size === o.size) { already++; alreadyBytes += o.size; continue; }
    queue.push({ bucket, name: o.name, size: o.size, out });
  }
}
const pendBytes = queue.reduce((a, o) => a + o.size, 0);

console.log(`\nSnapshot : ${SNAP}`);
console.log(`Destino  : ${DEST}`);
console.log(`Já baixado: ${already} arquivos (${mb(alreadyBytes)} MB)`);
console.log(`Pendente  : ${queue.length} arquivos (${mb(pendBytes)} MB) de ${mb(totalBytes)} MB no total\n`);
if (DRY || !queue.length) { if (!queue.length) console.log('Nada a baixar.'); process.exit(0); }

// Espaço em disco antes de começar
try {
  const { execSync } = await import('node:child_process');
  fs.mkdirSync(DEST, { recursive: true });
  const avail = Number(execSync(`df -k "${DEST}" | tail -1 | awk '{print $4}'`).toString().trim()) * 1024;
  console.log(`Espaço livre no destino: ${mb(avail)} MB`);
  if (avail < pendBytes * 1.1) {
    console.error(`\n\x1b[31m✗ Espaço insuficiente.\x1b[0m Precisa de ~${mb(pendBytes * 1.1)} MB.`);
    console.error('  Use --dest para apontar um disco externo, ou --buckets para priorizar.\n');
    process.exit(1);
  }
} catch { /* df indisponível — segue */ }

const t0 = Date.now();
let done = 0, doneBytes = 0, failed = [];

async function fetchOne(job) {
  const url = `${URL_}/storage/v1/object/${job.bucket}/${job.name.split('/').map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: H });
  if (!r.ok) { failed.push({ ...job, status: r.status }); return; }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  fs.writeFileSync(job.out + '.part', buf);
  fs.renameSync(job.out + '.part', job.out);
  done++; doneBytes += buf.length;
  if (done % 25 === 0) {
    const el = (Date.now() - t0) / 1000;
    const rate = doneBytes / el / 1048576;
    const left = (pendBytes - doneBytes) / 1048576 / Math.max(rate, 0.01);
    console.log(`  ${done}/${queue.length} · ${mb(doneBytes)} MB · ${rate.toFixed(1)} MB/s · restam ~${(left / 60).toFixed(1)} min`);
  }
}

let idx = 0, stopped = false;
async function worker() {
  while (idx < queue.length) {
    if (MAX_S && (Date.now() - t0) / 1000 > MAX_S) { stopped = true; return; }
    const job = queue[idx++];
    try { await fetchOne(job); } catch (e) { failed.push({ ...job, status: e.message }); }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

const el = (Date.now() - t0) / 1000;
console.log(`\n${done} arquivos baixados (${mb(doneBytes)} MB) em ${el.toFixed(0)}s`);
if (failed.length) {
  console.log(`\x1b[33m! ${failed.length} falharam\x1b[0m — rode de novo para tentar apenas esses.`);
  fs.writeFileSync(path.join(SNAP, 'storage_failed.json'), JSON.stringify(failed.slice(0, 500), null, 2));
}
if (stopped) console.log(`\x1b[33m! Parou por --max-seconds ${MAX_S}. Rode de novo para continuar.\x1b[0m`);
else if (!failed.length) console.log('\x1b[32m✓ Bucket(s) completos.\x1b[0m');

fs.writeFileSync(path.join(SNAP, 'storage_download_report.json'), JSON.stringify({
  dest: DEST, updated_at: new Date().toISOString(),
  buckets: ONLY.length ? ONLY : Object.keys(inv),
  files_done: already + done, files_total: already + done + queue.length - done,
  bytes_done: alreadyBytes + doneBytes, bytes_total: totalBytes,
  failed: failed.length, complete: !stopped && !failed.length,
}, null, 2));
