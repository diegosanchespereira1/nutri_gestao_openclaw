"use server";

import { APP_DASHBOARD_PATH } from "@/lib/routes";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formatBRLFromCents,
  summarizeOverdueCharges,
} from "@/lib/dashboard/financial-pending";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import type {
  FinancialChargeListRow,
  FinancialChargeStatus,
} from "@/lib/types/financial-charges";
import { isAllowedChargeCategory } from "@/lib/constants/financial-charge-category";
import {
  chargeMutationPath,
  parseChargeDueDate,
  parseChargeMutationSource,
  parseChargeRecurring,
  resolveChargeRecurrence,
} from "@/lib/financeiro/charge-form";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

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
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) {
    return {
      overdueCount: 0,
      overdueTotalCents: 0,
      overdueTotalLabel: formatBRLFromCents(0),
    };
  }

  const { data, error } = await supabase
    .from("financial_charges")
    .select("due_date, amount_cents, status")
    .eq("owner_user_id", workspaceOwnerId)
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
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("financial_charges")
    .select(
      `
      id,
      client_id,
      description,
      category,
      amount_cents,
      due_date,
      is_recurring,
      recurrence_ends_on,
      status,
      paid_at,
      created_at,
      clients ( legal_name, trade_name )
    `,
    )
    .eq("owner_user_id", workspaceOwnerId)
    .order("due_date", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as unknown as FinancialChargeListRow[] };
}

export async function loadFinancialChargesForClient(
  clientId: string,
): Promise<{ rows: FinancialChargeListRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: clientOk } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  if (!clientOk) return { rows: [] };

  const { data, error } = await supabase
    .from("financial_charges")
    .select(
      `
      id,
      client_id,
      description,
      category,
      amount_cents,
      due_date,
      is_recurring,
      recurrence_ends_on,
      status,
      paid_at,
      created_at,
      clients ( legal_name, trade_name )
    `,
    )
    .eq("owner_user_id", workspaceOwnerId)
    .eq("client_id", clientId)
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
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const clientId = String(formData.get("client_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const due = parseChargeDueDate(String(formData.get("due_date") ?? ""));
  const cents = parseMoneyToCents(amountRaw);
  const source = parseChargeMutationSource(
    String(formData.get("source") ?? ""),
  );
  const recurrence = due
    ? resolveChargeRecurrence({
        dueDate: due,
        isRecurring: parseChargeRecurring(
          String(formData.get("is_recurring") ?? ""),
        ),
        endsOnRaw: String(formData.get("recurrence_ends_on") ?? ""),
      })
    : { ok: false as const };

  if (!clientId || !category || !due || cents === null) {
    redirect(chargeMutationPath(source, clientId || null, "invalid"));
  }
  if (!recurrence.ok) {
    redirect(chargeMutationPath(source, clientId, "recurrence"));
  }

  const { data: clientOk, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  if (clientErr || !clientOk) {
    redirect(chargeMutationPath(source, clientId, "client"));
  }

  const { data: customCategoryRows } = await supabase
    .from("financial_charge_categories")
    .select("label")
    .eq("owner_user_id", workspaceOwnerId);

  const customLabels = (customCategoryRows ?? []).map((row) =>
    String(row.label),
  );
  if (!isAllowedChargeCategory(category, customLabels)) {
    redirect(chargeMutationPath(source, clientId, "invalid"));
  }

  const { error } = await supabase.from("financial_charges").insert({
    owner_user_id: workspaceOwnerId,
    client_id: clientId,
    description: description.length > 0 ? description : "",
    category,
    amount_cents: cents,
    due_date: due,
    is_recurring: recurrence.isRecurring,
    recurrence_ends_on: recurrence.endsOn,
    status: "open",
  });

  if (error) {
    redirect(chargeMutationPath(source, clientId, "save"));
  }

  revalidatePath("/financeiro");
  revalidatePath(APP_DASHBOARD_PATH);
  revalidatePath(`/clientes/${clientId}/editar`);
  redirect(chargeMutationPath(source, clientId));
}

export async function markFinancialChargePaidAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/financeiro?err=invalid&tab=operacoes");

  const { data: existing } = await supabase
    .from("financial_charges")
    .select("client_id")
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  const { error } = await supabase
    .from("financial_charges")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .eq("status", "open");

  if (error) {
    redirect("/financeiro?err=save&tab=operacoes");
  }

  revalidatePath("/financeiro");
  revalidatePath(APP_DASHBOARD_PATH);
  const cid = existing?.client_id as string | undefined;
  if (cid) {
    revalidatePath(`/clientes/${cid}/editar`);
  }
  redirect("/financeiro?tab=operacoes");
}
