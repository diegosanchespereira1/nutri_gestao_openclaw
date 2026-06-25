import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerAppOrigin } from "@/lib/app-origin";

export type AuthEmailResult = { ok: true } | { ok: false; error: string };

function passwordResetRedirectTo(): string {
  const origin = getServerAppOrigin();
  return `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
}

/**
 * Dispara email de recuperação/convite via GoTrue (SMTP configurado no Supabase self-hosted).
 * Usa o template `recovery` ou `invite` definido em supabase/templates/.
 */
export async function sendPasswordRecoveryViaSupabase(
  supabase: SupabaseClient,
  email: string,
): Promise<AuthEmailResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectTo(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Convite inicial — template invite.html do GoTrue.
 * Cria o utilizador se ainda não existir e envia o email pelo SMTP do Supabase.
 */
export async function sendTenantInviteViaSupabase(
  supabase: SupabaseClient,
  input: { email: string; fullName: string },
): Promise<AuthEmailResult & { userId?: string }> {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    input.email.trim(),
    {
      data: {
        full_name: input.fullName,
        acquisition_source: "admin_created",
      },
      redirectTo: passwordResetRedirectTo(),
    },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, userId: data.user?.id };
}
