#!/usr/bin/env node
/**
 * setup-stripe-webhook.mjs — cria (ou confere) o endpoint de webhook do Stripe e grava
 * o STRIPE_WEBHOOK_SECRET no arquivo de env.
 *
 * Assina exatamente os eventos que `lib/signup/process-stripe-event.ts` trata hoje:
 *   checkout.session.completed · checkout.session.expired
 *   customer.subscription.updated · customer.subscription.deleted
 *
 * ⚠️  O `whsec_` só é devolvido pelo Stripe **no momento da criação**. Se o endpoint já
 * existir e você não tiver o segredo, não há como lê-lo pela API: apague o endpoint na
 * dashboard e rode de novo (ou use "Roll secret" e copie à mão).
 *
 * Uso:
 *   node scripts/billing/setup-stripe-webhook.mjs --url https://dev-nutricao.nutrigestao.app --dry-run
 *   node scripts/billing/setup-stripe-webhook.mjs --url https://dev-nutricao.nutrigestao.app
 */
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, d) => { const i = argv.indexOf(f); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };

const DRY_RUN = has("--dry-run");
const ALLOW_LIVE = has("--live");
const ENV_FILE = valueOf("--env-file", ".env.local");
const PATH_SUFFIX = "/api/stripe/webhook";

const EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

const envPath = path.resolve(process.cwd(), ENV_FILE);
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const pick = (k) => (process.env[k] ?? (envText.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] ?? ""))
  .trim().replace(/^["']|["']$/g, "");

const STRIPE_KEY = pick("STRIPE_SECRET_KEY");
if (!STRIPE_KEY) die(`STRIPE_SECRET_KEY ausente (procurei em process.env e em ${ENV_FILE}).`);

const IS_LIVE = STRIPE_KEY.startsWith("sk_live_") || STRIPE_KEY.startsWith("rk_live_");
if (IS_LIVE && !ALLOW_LIVE) die("Chave de PRODUÇÃO sem --live. Para teste, use uma sk_test_.");

const rawBase = valueOf("--url", pick("NEXT_PUBLIC_SITE_URL"));
if (!rawBase) die("Informe a URL base com --url (ex.: https://dev-nutricao.nutrigestao.app).");
const base = rawBase.trim().replace(/\/$/, "");
if (!/^https:\/\//.test(base)) die(`O Stripe exige HTTPS no endpoint. Recebi: ${base}`);
const url = base + PATH_SUFFIX;

const stripe = new Stripe(STRIPE_KEY);

function writeEnv(key, value) {
  const line = `${key}=${value}`;
  const next = new RegExp(`^${key}=.*$`, "m").test(envText)
    ? envText.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : envText.replace(/\n*$/, "\n") + line + "\n";
  fs.writeFileSync(envPath, next);
}

async function main() {
  console.log(`\n  Stripe: ${IS_LIVE ? "LIVE (produção)" : "TEST (sandbox)"}`);
  console.log(`  Endpoint: ${url}${DRY_RUN ? "   [DRY RUN]" : ""}\n`);

  // Alcançabilidade: o Stripe aceita criar apontando para uma URL que responde 404,
  // e aí todo evento falha na entrega. Melhor descobrir agora.
  try {
    const probe = await fetch(url, { method: "POST", body: "{}",
      headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(15000) });
    if (probe.status === 404) {
      console.log(`  ⚠️  ${url} responde 404 — a rota não está no build publicado.`);
      console.log(`      O endpoint pode ser criado assim mesmo, mas os eventos só serão`);
      console.log(`      entregues depois do deploy (o Stripe repete por até 3 dias).\n`);
    } else {
      console.log(`  ✓ endpoint responde HTTP ${probe.status} (esperado 400/503 sem assinatura válida)\n`);
    }
  } catch (e) {
    console.log(`  ⚠️  não consegui alcançar ${url}: ${e.message}\n`);
  }

  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url);

  if (existing) {
    console.log(`  Já existe um endpoint para esta URL: ${existing.id}`);
    const missing = EVENTS.filter((e) => !existing.enabled_events.includes(e));
    if (missing.length && !DRY_RUN) {
      await stripe.webhookEndpoints.update(existing.id, { enabled_events: EVENTS });
      console.log(`  Eventos atualizados (faltavam: ${missing.join(", ")})`);
    } else if (missing.length) {
      console.log(`  (dry-run) Eventos que seriam adicionados: ${missing.join(", ")}`);
    } else {
      console.log(`  Eventos já conferem — nada a fazer.`);
    }
    console.log(
      `\n  ⚠️  O whsec_ não é legível pela API depois da criação.\n` +
        `      Se o STRIPE_WEBHOOK_SECRET estiver vazio, apague este endpoint na dashboard\n` +
        `      e rode o script de novo, ou use "Roll secret" e cole o valor à mão.\n`,
    );
    return;
  }

  if (DRY_RUN) {
    console.log(`  (dry-run) Seria criado um endpoint com os eventos:\n    ${EVENTS.join("\n    ")}\n`);
    return;
  }

  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: "NutriGestão — cadastro público e assinaturas",
  });

  console.log(`  ✓ endpoint criado: ${created.id}`);
  console.log(`    eventos: ${EVENTS.join(", ")}`);

  if (created.secret) {
    writeEnv("STRIPE_WEBHOOK_SECRET", created.secret);
    console.log(`  ✓ STRIPE_WEBHOOK_SECRET gravado em ${ENV_FILE} (prefixo ${created.secret.slice(0, 10)}…)\n`);
  } else {
    die("O Stripe não devolveu o secret. Pegue em Developers → Webhooks → Signing secret.");
  }
}

main().catch((e) => die(e.message ?? String(e)));
