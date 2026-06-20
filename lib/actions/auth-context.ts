"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type WorkspaceAuthContext =
  | { ok: true; userId: string; workspaceOwnerId: string }
  | { ok: false; error: string };

/**
 * Resolve autenticação e titular do workspace em um único helper
 * para reduzir duplicação de `auth.getUser()` + resolução de owner.
 */
export async function requireWorkspaceAuthContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<WorkspaceAuthContext> {
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
