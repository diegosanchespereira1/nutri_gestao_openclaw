"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formatBRLFromCents,
  summarizeOverdueCharges,
} from "@/lib/dashboard/financial-pending";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import type {
  FinancialChargeListRow,
  FinancialChargeStatus,
} from "@/lib/types/financial-charges";

function parseDueDate(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function parseMoneyToCents(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function loadFinancialDashboardSummary(timeZone: string): Promise<{
  overdueCount: number;
  overdueTotalCents: number;
  overdueTotalLabel: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      overdueCount: 0,
      overdueTotalCents: 0,
      overdueTotalLabel: formatBRLFromCents(0),
    };
  }

  const { data, error } = await supabase
    .from("financial_charges")
    .select("due_date, amount_cents, status")
    .eq("owner_user_id", user.id)
    .eq("status", "open");

  if (error || !data) {
    return {
      overdueCount: 0,
      overdueTotalCents: 0,
      overdueTotalLabel: formatBRLFromCents(0),
    };
  }

  const tKey = todayKey(new Date(), timeZone);
  const rows = data as Array<{
    due_date: string;
    amount_cents: number;
    status: FinancialChargeStatus;
  }>;
  const { overdueCount, overdueTotalCents } = summarizeOverdueCharges(
    rows,
    tKey,
  );
  return {
    overdueCount,
    overdueTotalCents,
    overdueTotalLabel: formatBRLFromCents(overdueTotalCents),
  };
}

export async function loadFinancialChargesForOwner(): Promise<{
  rows: FinancialChargeListRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("financial_charges")
    .select(
      `
      id,
      description,
      amount_cents,
      due_date,
      status,
      paid_at,
      clients ( legal_name, trade_name )
    `,
    )
    .eq("owner_user_id", user.id)
    .order("due_date", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as unknown as FinancialChargeListRow[] };
}

export async function createFinancialChargeAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientId = String(formData.get("client_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const due = parseDueDate(String(formData.get("due_date") ?? ""));
  const cents = parseMoneyToCents(amountRaw);

  if (!clientId || !due || cents === null) {
    redirect("/financeiro?err=invalid");
  }

  const { data: clientOk, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (clientErr || !clientOk) {
    redirect("/financeiro?err=client");
  }

  const { error } = await supabase.from("financial_charges").insert({
    owner_user_id: user.id,
    client_id: clientId,
    description: description.length > 0 ? description : "",
    amount_cents: cents,
    due_date: due,
    status: "open",
  });

  if (error) {
    redirect("/financeiro?err=save");
  }

  revalidatePath("/financeiro");
  revalidatePath("/inicio");
  redirect("/financeiro");
}

export async function markFinancialChargePaidAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/financeiro?err=invalid");

  const { error } = await supabase
    .from("financial_charges")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .eq("status", "open");

  if (error) {
    redirect("/financeiro?err=save");
  }

  revalidatePath("/financeiro");
  revalidatePath("/inicio");
  redirect("/financeiro");
}
