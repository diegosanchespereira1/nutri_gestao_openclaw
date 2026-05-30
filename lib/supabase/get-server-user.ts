import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

function userFromId(userId: string): User {
  return { id: userId } as User;
}

async function readProfileContextFromCookies() {
  const cookieStore = await cookies();
  return parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
}

/**
 * Auth + supabase client, deduped once per request.
 * Reutiliza `ng_profile_ctx` (validado no middleware) para evitar um segundo
 * roundtrip a `/auth/v1/user` em cada navegação.
 */
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const profileCtx = await readProfileContextFromCookies();
  if (profileCtx?.userId) {
    return { supabase, user: userFromId(profileCtx.userId) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * Auth + workspace owner ID, deduped once per request.
 * Preferência: cookie de perfil → fallback a queries Supabase.
 */
export const getServerContext = cache(async () => {
  const supabase = await createClient();
  const profileCtx = await readProfileContextFromCookies();

  if (profileCtx?.userId) {
    const workspaceOwnerId =
      profileCtx.workspaceOwnerId.length > 0
        ? profileCtx.workspaceOwnerId
        : profileCtx.userId;
    return {
      supabase,
      user: userFromId(profileCtx.userId),
      workspaceOwnerId,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, workspaceOwnerId: null };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return { supabase, user, workspaceOwnerId };
});
