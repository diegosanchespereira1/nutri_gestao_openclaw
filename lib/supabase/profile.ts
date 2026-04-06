import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileRole } from "@/lib/roles";
import { isProfileRole } from "@/lib/roles";
import {
  DEFAULT_PROFILE_TIME_ZONE,
  normalizeAppTimeZone,
} from "@/lib/timezones";

export async function fetchProfileRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.role) return null;
  return isProfileRole(data.role) ? data.role : null;
}

/** True quando o perfil existe e ainda não concluiu o wizard (Story 2.7). */
export async function profileNeedsOnboarding(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.onboarding_completed_at === null;
}

export async function fetchProfileTimeZone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.timezone) return DEFAULT_PROFILE_TIME_ZONE;
  return normalizeAppTimeZone(data.timezone);
}
