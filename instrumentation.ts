/**
 * Next.js Instrumentation Hook — executado UMA VEZ ao iniciar o servidor Node.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Valida variáveis de ambiente críticas em runtime e regista o resultado
 * nos logs do container (visíveis no Portainer → Container logs).
 */
export async function register() {
  // Só corre no runtime Node.js (não no Edge runtime nem no build).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const env = process.env;

  // ── 1. SUPABASE_SERVICE_ROLE_KEY ────────────────────────────────────────
  const srKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const srKey = Reflect.get(env, srKeyName);
  const srKeyOk =
    typeof srKey === "string" && srKey.trim().length > 20;

  if (srKeyOk) {
    console.info(
      `[startup] ✅ SUPABASE_SERVICE_ROLE_KEY presente (${srKey.trim().length} chars).`,
    );
  } else {
    console.error(
      "[startup] ❌ SUPABASE_SERVICE_ROLE_KEY AUSENTE ou inválida.",
      {
        valorRecebido: typeof srKey,
        comprimento:
          typeof srKey === "string" ? srKey.trim().length : 0,
        todasChavesSupabase: Object.keys(env).filter((k) =>
          k.toUpperCase().includes("SUPABASE"),
        ),
      },
    );
    console.error(
      "[startup] ➜  No Portainer: Service → Environment → adicionar " +
        "SUPABASE_SERVICE_ROLE_KEY com o valor de Project Settings → API → service_role." +
        " Após guardar: Recreate (não só Save).",
    );
  }

  // ── 2. Outras vars obrigatórias ─────────────────────────────────────────
  const checks: Array<{ key: string; required: boolean }> = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
    { key: "RESEND_API_KEY", required: false },
    { key: "DOSSIER_EMAIL_FROM", required: false },
  ];

  for (const { key, required } of checks) {
    const val = env[key] ?? process.env[key];
    const present = typeof val === "string" && val.trim().length > 0;
    if (!present && required) {
      console.error(`[startup] ❌ ${key} AUSENTE (obrigatória).`);
    } else if (!present) {
      console.warn(`[startup] ⚠️  ${key} não definida (funcionalidade opcional desactivada).`);
    } else {
      console.info(`[startup] ✅ ${key} presente.`);
    }
  }
}
