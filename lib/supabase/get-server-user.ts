import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

/** Auth check + supabase client, deduped once per request via React cache. */
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Auth + workspace owner ID, deduped once per request via React cache. */
export const getServerContext = cache(async () => {
  const { supabase, user } = await getServerUser();
  if (!user) return { supabase, user: null, workspaceOwnerId: null };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return { supabase, user, workspaceOwnerId };
});
