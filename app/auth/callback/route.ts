import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseAuthCallbackClient } from "@/lib/supabase/auth-callback-client";

const OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function parseOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  const t = raw as EmailOtpType;
  return OTP_TYPES.has(t) ? t : null;
}

function loginAuthError(requestUrl: URL, extra?: { description?: string | null }) {
  const u = new URL("/login", requestUrl.origin);
  u.searchParams.set("error", "auth");
  if (extra?.description) {
    u.searchParams.set("error_description", extra.description);
  }
  return NextResponse.redirect(u);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = parseOtpType(url.searchParams.get("type"));

  const nextRaw = url.searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/inicio";

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return loginAuthError(url, {
      description: url.searchParams.get("error_description"),
    });
  }

  if (!code && !(token_hash && type)) {
    return loginAuthError(url);
  }

  const redirectUrl = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectUrl);

  let supabase;
  try {
    supabase = createSupabaseAuthCallbackClient(request, response);
  } catch {
    return loginAuthError(url);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginAuthError(url);
    }
    return response;
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: token_hash!,
    type: type!,
  });
  if (error) {
    return loginAuthError(url);
  }

  return response;
}
