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
    RESEND_API_KEY:
      typeof nodeEnv["RESEND_API_KEY"] === "string" &&
      nodeEnv["RESEND_API_KEY"].trim().length > 0
        ? "✅ presente"
        : "⚠️ ausente (email opcional)",
    NODE_ENV: process.env.NODE_ENV ?? "desconhecido",
    // Lista apenas os nomes (não valores) das vars que contêm "SUPABASE".
    supabase_keys_found: Object.keys(nodeEnv).filter((k) =>
      k.toUpperCase().includes("SUPABASE"),
    ),
  };

  return NextResponse.json(result);
}
