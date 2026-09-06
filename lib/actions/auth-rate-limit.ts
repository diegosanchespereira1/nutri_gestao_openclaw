"use server";

import { headers } from "next/headers";

import { getServerAppOrigin } from "@/lib/app-origin";
import {
  formatAuthRateLimitError,
  formatPasswordResetRateLimitError,
} from "@/lib/auth/rate-limit-messages";
import { mapSupabaseRecoverPasswordError } from "@/lib/map-supabase-auth-error";
import {
  checkAuthRateLimitByIp,
  checkPasswordResetRateLimit,
  getClientIpFromHeaders,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type AuthRateLimitActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function readActionClientIp(): Promise<string> {
  const hdrs = await headers();
  return getClientIpFromHeaders(
    hdrs.get("x-forwarded-for"),
    hdrs.get("x-real-ip"),
  );
}

/**
 * Consome o rate limit de auth (5/min por IP) antes de signIn/MFA no client.
 * Sem isto, o GoTrue é chamado direto do browser e o Upstash nunca entra.
 */
export async function assertAuthRateLimitAction(): Promise<AuthRateLimitActionResult> {
  try {
    const result = await checkAuthRateLimitByIp(await readActionClientIp());
    if (!result.success) {
      return { ok: false, error: formatAuthRateLimitError(result.retryAfter) };
    }
    return { ok: true };
  } catch (error) {
    console.error("[assertAuthRateLimitAction]", error);
    return { ok: false, error: formatAuthRateLimitError(60) };
  }
}

function passwordResetRedirectTo(): string {
  const origin = getServerAppOrigin();
  return `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
}

/**
 * Pedido de recuperação com rate limit por email (3/hora) no servidor.
 * O redirectTo não vem do browser — evita origem manipulada.
 */
export async function requestPasswordResetAction(
  email: string,
): Promise<AuthRateLimitActionResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@") || normalized.length < 5) {
    return { ok: false, error: "Indique um email válido." };
  }

  try {
    const limit = await checkPasswordResetRateLimit(normalized);
    if (!limit.success) {
      return {
        ok: false,
        error: formatPasswordResetRateLimitError(limit.retryAfter),
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: passwordResetRedirectTo(),
    });

    if (error) {
      return { ok: false, error: mapSupabaseRecoverPasswordError(error) };
    }
    return { ok: true };
  } catch (error) {
    console.error("[requestPasswordResetAction]", error);
    return {
      ok: false,
      error: "Não foi possível concluir o pedido. Tente mais tarde.",
    };
  }
}
