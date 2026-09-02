#!/usr/bin/env node
/**
 * sync-stripe-plans.mjs — cria/atualiza os Products e Prices do Stripe a partir de
 * `public.subscription_plans` e grava os IDs de volta na mesma tabela.
 *
 * Convenção (a do schema, NÃO a do Stratos Bot em live):
 *   1 Product por plano  →  subscription_plans.stripe_product_id
 *   2 Prices por plano   →  stripe_price_monthly_id / stripe_price_annual_id
 *
 * Idempotente por `lookup_key` (`nutrigestao_<slug>_month|year`). Rodar duas vezes não
 * duplica nada. Price no Stripe é imutável: se o valor no banco mudar, o script cria um
 * price novo, transfere o lookup_key e arquiva o antigo (assinaturas vigentes não mudam).
 *
 * Planos sem Stripe são pulados, espelhando `checkoutKindForPlan`:
 *   free (ou price_monthly_cents <= 0) → checkout "free";  enterprise → checkout "sales".
 *
 * Uso:
 *   node scripts/billing/sync-stripe-plans.mjs --dry-run
 *   node scripts/billing/sync-stripe-plans.mjs
 *   node scripts/billing/sync-stripe-plans.mjs --env-file .env.producao --live
 *
 * Guarda de segurança: com uma chave `sk_live_` o script aborta a menos que receba --live.
 */
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i > -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DRY_RUN = has("--dry-run");
const ALLOW_LIVE = has("--live");
const ENV_FILE = valueOf("--env-file", ".env.local");

// ── env ──────────────────────────────────────────────────────────────────────
function readEnvFile(file) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return {};
  const out = {};
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = readEnvFile(ENV_FILE);
const pick = (k) => (process.env[k] ?? fileEnv[k] ?? "").trim();

const STRIPE_KEY = pick("STRIPE_SECRET_KEY");
const SB_URL = pick("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const SB_KEY = pick("SUPABASE_SERVICE_ROLE_KEY");

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!STRIPE_KEY) die(`STRIPE_SECRET_KEY ausente (procurei em process.env e em ${ENV_FILE}).`);
if (!SB_URL || !SB_KEY) die(`NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes em ${ENV_FILE}.`);

const IS_LIVE = STRIPE_KEY.startsWith("sk_live_") || STRIPE_KEY.startsWith("rk_live_");
if (IS_LIVE && !ALLOW_LIVE) {
  die(
    "A chave é de PRODUÇÃO (sk_live_) e --live não foi passado.\n" +
      "  Para o ambiente de testes, use uma chave sk_test_ no arquivo de env.\n" +
      "  Se a intenção é mesmo criar em produção, repita com --live.",
  );
}

const MODE = IS_LIVE ? "LIVE (produção)" : "TEST (sandbox)";
const stripe = new Stripe(STRIPE_KEY);

// ── supabase (PostgREST, mesmo padrão de scripts/database/backup-rest.mjs) ────
async function sb(pathAndQuery, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`PostgREST ${res.status} em ${pathAndQuery}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const brl = (cents) =>
  (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── prices ───────────────────────────────────────────────────────────────────
/**
 * Garante um price recorrente com o lookup_key dado.
 * Reaproveita se valor/moeda/intervalo baterem; senão cria um novo, transfere o
 * lookup_key e arquiva o antigo (price é imutável no Stripe).
 */
async function ensurePrice({ productId, lookupKey, unitAmount, interval, planSlug }) {
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const current = found.data[0];

  const matches =
    current &&
    current.active &&
    current.product === productId &&
    current.currency === "brl" &&
    current.unit_amount === unitAmount &&
    current.recurring?.interval === interval;

  if (matches) return { id: current.id, action: "reaproveitado" };

  if (DRY_RUN) {
    return { id: "(dry-run)", action: current ? "seria substituído" : "seria criado" };
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: "brl",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: Boolean(current),
    metadata: { nutrigestao_plan: planSlug, nutrigestao_interval: interval },
  });

  if (current) await stripe.prices.update(current.id, { active: false });

  return { id: created.id, action: current ? "substituído" : "criado" };
}

// ── products ─────────────────────────────────────────────────────────────────
async function ensureProduct(plan) {
  // 1) o ID que o banco já conhece, se ainda existir e estiver ativo
  if (plan.stripe_product_id) {
    try {
      const existing = await stripe.products.retrieve(plan.stripe_product_id);
      if (existing && !existing.deleted && existing.active) {
        return { id: existing.id, action: "reaproveitado" };
      }
    } catch {
      /* ID obsoleto (ou de outro modo: test x live) — cai no passo 2 */
    }
  }

  // 2) procura pela metadata no catálogo (sem usar Search API: ela tem latência de índice
  //    e quebraria a idempotência de duas execuções seguidas)
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.nutrigestao_plan === plan.slug) {
      return { id: product.id, action: "encontrado pela metadata" };
    }
  }

  if (DRY_RUN) return { id: "(dry-run)", action: "seria criado" };

  const created = await stripe.products.create({
    name: `NutriGestão ${plan.name}`,
    description: plan.description ?? undefined,
    metadata: { nutrigestao_plan: plan.slug },
  });
  return { id: created.id, action: "criado" };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  Stripe: ${MODE}`);
  console.log(`  Supabase: ${SB_URL}`);
  console.log(`  Env: ${ENV_FILE}${DRY_RUN ? "   [DRY RUN — nada é gravado]" : ""}\n`);

  let plans;
  try {
    plans = await sb(
      "subscription_plans?select=slug,name,description,price_monthly_cents,price_annual_cents," +
        "stripe_product_id,stripe_price_monthly_id,stripe_price_annual_id&order=price_monthly_cents.asc",
    );
  } catch (err) {
    // DEV costuma estar atrás de PRD; sem as colunas não adianta criar nada no Stripe.
    if (/stripe_(product|price)_/.test(err.message)) {
      die(
        "subscription_plans não tem as colunas stripe_* neste banco.\n" +
          "  Falta aplicar a migração supabase/migrations/20261004120000_public_signup_billing.sql.\n" +
          "  Rode scripts/database/push-migrations-dev.sh --dry-run e depois sem --dry-run.\n\n" +
          `  Erro original: ${err.message}`,
      );
    }
    throw err;
  }

  const billable = plans.filter(
    (p) => p.slug !== "enterprise" && p.slug !== "free" && Number(p.price_monthly_cents) > 0,
  );
  const skipped = plans.filter((p) => !billable.includes(p));

  for (const p of skipped) {
    const why = p.slug === "enterprise" ? "checkout via vendas" : "plano gratuito";
    console.log(`  ⏭  ${p.slug.padEnd(12)} pulado — ${why}`);
  }
  if (skipped.length) console.log("");

  const summary = [];

  for (const plan of billable) {
    const product = await ensureProduct(plan);
    console.log(`  ▸ ${plan.name} (${plan.slug})`);
    console.log(`      product   ${product.id}  — ${product.action}`);

    const monthly = await ensurePrice({
      productId: product.id,
      lookupKey: `nutrigestao_${plan.slug}_month`,
      unitAmount: Number(plan.price_monthly_cents),
      interval: "month",
      planSlug: plan.slug,
    });
    console.log(
      `      mensal    ${monthly.id}  ${brl(plan.price_monthly_cents)} — ${monthly.action}`,
    );

    let annual = null;
    if (Number(plan.price_annual_cents) > 0) {
      annual = await ensurePrice({
        productId: product.id,
        lookupKey: `nutrigestao_${plan.slug}_year`,
        unitAmount: Number(plan.price_annual_cents),
        interval: "year",
        planSlug: plan.slug,
      });
      console.log(
        `      anual     ${annual.id}  ${brl(plan.price_annual_cents)} — ${annual.action}`,
      );
    } else {
      console.log(`      anual     — price_annual_cents nulo/zero, price anual não criado`);
    }

    const patch = {
      stripe_product_id: product.id,
      stripe_price_monthly_id: monthly.id,
      ...(annual ? { stripe_price_annual_id: annual.id } : {}),
    };

    if (DRY_RUN) {
      console.log(`      banco     (dry-run) subscription_plans.slug=${plan.slug} ←`, patch);
    } else {
      await sb(`subscription_plans?slug=eq.${encodeURIComponent(plan.slug)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      console.log(`      banco     subscription_plans atualizado`);
    }

    summary.push({ plan: plan.slug, ...patch });
    console.log("");
  }

  console.log(`  ${DRY_RUN ? "Simulação concluída" : "Sincronizado"} — ${summary.length} plano(s).\n`);
}

main().catch((err) => die(err.message ?? String(err)));
