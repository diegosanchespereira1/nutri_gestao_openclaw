/**
 * GET /api/admin/env-check
 *
 * Endpoint de diagnóstico — confirma quais variáveis de ambiente críticas
 * chegaram ao processo Node em runtime.
 *
 * Requer sessão autenticada (qualquer utilizador válido).
 * Não expõe valores — apenas presença e comprimento.
 */
import { NextResponse } from "next/server";
import { env as nodeEnv } from "node:process";
import { createClient } from "@/lib/supabase/server";
import { isSmtpConfigured } from "@/lib/email/smtp-config";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";

/**
 * Descreve uma variável sem revelar o valor: presença, comprimento e — quando faz
 * sentido — se o prefixo bate com o esperado. O prefixo pega o caso de chave de
 * produção colada num ambiente de teste, que "presente ✅" sozinho esconderia.
 *
 * `""` é tratado como AUSENTE de propósito: o compose passa `${VAR:-}`, então uma
 * variável não definida no Portainer chega como string vazia, e o código de produção
 * (`?.trim() || null`) também a lê como ausente.
 */
function describeSecret(
  raw: string | undefined,
  opts: { expectedPrefixes?: string[] } = {},
): string {
  const value = raw?.trim() ?? "";
  if (!value) return "❌ AUSENTE";

  const { expectedPrefixes } = opts;
  if (expectedPrefixes?.length) {
    const hit = expectedPrefixes.find((p) => value.startsWith(p));
    if (!hit) {
      return `⚠️ presente (${value.length} chars) mas o prefixo não é ${expectedPrefixes.join(" / ")}`;
    }
    return `✅ presente (${value.length} chars, ${hit}…)`;
  }
  return `✅ presente (${value.length} chars)`;
}

export async function GET() {
  // Exige sessão — não expõe nada a utilizadores anónimos.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const srKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const srKey = Reflect.get(nodeEnv, srKeyName);
  const srKeyPresent =
    typeof srKey === "string" && srKey.trim().length > 20;

  const result = {
    SUPABASE_SERVICE_ROLE_KEY: srKeyPresent
      ? `✅ presente (${(srKey as string).trim().length} chars)`
      : "❌ AUSENTE",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "✅ presente"
      : "❌ AUSENTE",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "✅ presente"
      : "❌ AUSENTE",
    SUPABASE_URL: readSupabaseUrl() ? "✅ presente (runtime/fallback)" : "❌ AUSENTE",
    SUPABASE_ANON_KEY: readSupabaseAnonKey()
      ? "✅ presente (runtime/fallback)"
      : "❌ AUSENTE",
    SMTP_APP:
      isSmtpConfigured()
        ? "✅ configurado (dossiê / portal / LGPD)"
        : "⚠️ ausente (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)",
    NODE_ENV: process.env.NODE_ENV ?? "desconhecido",

    // Cadastro público / Stripe. Só presença e comprimento — nunca o valor.
    // Serve para responder "a variável chegou ao container?" sem depender do
    // Portainer: o bloco `environment:` do compose é uma lista fechada, e chave
    // que não está lá não existe aqui dentro.
    STRIPE_SECRET_KEY: describeSecret(process.env.STRIPE_SECRET_KEY, {
      expectedPrefixes: ["sk_test_", "sk_live_", "rk_test_", "rk_live_"],
    }),
    STRIPE_WEBHOOK_SECRET: describeSecret(process.env.STRIPE_WEBHOOK_SECRET, {
      expectedPrefixes: ["whsec_"],
    }),
    SIGNUP_INTENT_SECRET: describeSecret(process.env.SIGNUP_INTENT_SECRET),
    SIGNUP_SALES_EMAIL: describeSecret(process.env.SIGNUP_SALES_EMAIL),
    SIGNUP_ABANDONMENT_NOTIFY_EMAIL: describeSecret(
      process.env.SIGNUP_ABANDONMENT_NOTIFY_EMAIL,
    ),
    // Lista apenas os nomes (não valores) das vars que contêm "SUPABASE".
    supabase_keys_found: Object.keys(nodeEnv).filter((k) =>
      k.toUpperCase().includes("SUPABASE"),
    ),
  };

  return NextResponse.json(result);
}
