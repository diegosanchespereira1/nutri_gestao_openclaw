"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canAccessAdminArea } from "@/lib/roles";
import type { AccountClosureRequestRow } from "@/lib/types/account-closure-request";

async function requireAdminArea() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canAccessAdminArea(profile?.role)) {
    redirect("/dashboard");
  }

  return { user, role: profile?.role ?? null };
}

export async function loadAccountClosureRequests(): Promise<{
  rows: AccountClosureRequestRow[];
  pendingCount: number;
}> {
  await requireAdminArea();

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("account_closure_requests")
    .select(
      "id, email, user_id, profile_id, source, status, notes, failure_reason, requested_at, processed_at, confirmed_at, cancelled_at, created_at",
    )
    .order("requested_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[loadAccountClosureRequests]", error);
    return { rows: [], pendingCount: 0 };
  }

  const rows = (data ?? []) as AccountClosureRequestRow[];
  const pendingCount = rows.filter((r) =>
    ["received", "email_sent", "pending_confirmation"].includes(r.status),
  ).length;

  return { rows, pendingCount };
}
