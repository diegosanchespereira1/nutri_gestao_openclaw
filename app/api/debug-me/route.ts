import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";

export async function GET() {
  const [supabase, cookieStore] = await Promise.all([createClient(), cookies()]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, role, full_name, timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const rawCookie = cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value ?? null;
  const parsedCookie = rawCookie ? (() => { try { return JSON.parse(rawCookie); } catch { return "parse_error"; } })() : null;

  function mask(val: string | undefined) {
    if (!val) return null;
    return val.slice(0, 12) + "..." + val.slice(-6);
  }

  const keyServer = process.env.SUPABASE_ANON_KEY;
  const keyPublic = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const keysMatch = keyServer === keyPublic;

  return NextResponse.json({
    user_email: user.email,
    user_id: user.id,
    db_profile: profile ?? null,
    db_error: error?.message ?? null,
    cookie_parsed: parsedCookie,
    anon_key_server_masked: mask(keyServer),
    anon_key_public_masked: mask(keyPublic),
    keys_match: keysMatch,
    diagnosis: !keysMatch
      ? "PROBLEMA: SUPABASE_ANON_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY são diferentes. O proxy usa NEXT_PUBLIC_SUPABASE_ANON_KEY e conecta em outra base."
      : "Chaves iguais — investigar outro motivo.",
  });
}
