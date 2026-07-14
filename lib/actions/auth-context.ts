"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type WorkspaceAuthContext =
  | { ok: true; userId: string; workspaceOwnerId: string }
  | { ok: false; error: string };

/**
 * Resolve autenticação e titular do workspace em um único helper
 * para reduzir duplicação de `auth.getUser()` + resolução de owner.
 * Prefere `getServerContext` (cookie de perfil) para evitar /auth/v1/user.
 */
export async function requireWorkspaceAuthContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<WorkspaceAuthContext> {
  // Tenta contexto com cookie primeiro (evita round-trip lento a Auth).
  const ctx = await getServerContext();
  if (ctx.user && ctx.workspaceOwnerId) {
    return {
      ok: true,
      userId: ctx.user.id,
      workspaceOwnerId: ctx.workspaceOwnerId,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return { ok: true, userId: user.id, workspaceOwnerId };
}

/** Confirma que o servidor reconhece a sessão (cookies propagados após login no browser). */
export async function pingWorkspaceAuthAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  return { ok: auth.ok };
}
