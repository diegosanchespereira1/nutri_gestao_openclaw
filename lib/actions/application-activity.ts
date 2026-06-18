"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type ApplicationActivityInput = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type ApplicationActivityResult =
  | { ok: true }
  | { ok: false; error: string };

export async function logApplicationActivityAction(
  input: ApplicationActivityInput,
): Promise<ApplicationActivityResult> {
  const eventType = input.eventType.trim();
  if (eventType.length === 0) {
    return { ok: false, error: "event_type_required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { error } = await supabase.from("application_activity_log").insert({
    owner_user_id: workspaceOwnerId,
    actor_user_id: user.id,
    event_type: eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) return { ok: false, error: "insert_failed" };
  return { ok: true };
}
