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

/** Contagem de clientes do titular (RLS aplica-se ao pedido autenticado). */
export async function countClientsForOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", userId);

  if (error || count == null) return 0;
  return count;
}

/**
 * True quando o utilizador ainda deve ver o wizard de onboarding:
 * onboarding não concluído e sem nenhum cliente na conta.
 * Se já existir cliente (ex.: importação), não forçamos o passo a passo.
 */
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
  if (data.onboarding_completed_at !== null) return false;

  const clientCount = await countClientsForOwner(supabase, userId);
  if (clientCount > 0) return false;

  return true;
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

export async function fetchProfileFullName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.full_name) return null;
  return data.full_name;
}

/** Bloqueio LGPD ativo: titular sem acesso à app (Story 11.7). */
export async function profileLgpdBlocked(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("lgpd_blocked_at, lgpd_unblocked_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return (
    data.lgpd_blocked_at != null && data.lgpd_unblocked_at == null
  );
}
