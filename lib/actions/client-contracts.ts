"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  BillingRecurrence,
  ClientContract,
  ClientContractWithClient,
  ContractAlertRow,
} from "@/lib/types/client-contracts";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

function parseAmountCents(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function isValidRecurrence(v: string): v is BillingRecurrence {
  return ["monthly", "annual", "one-time"].includes(v);
}

// ── queries ───────────────────────────────────────────────────────────────────

export async function loadContractsByClient(clientId: string): Promise<{
  rows: ClientContract[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  // Verify client belongs to tenant
  const { data: clientOk } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();
  if (!clientOk) return { rows: [] };

  const { data, error } = await supabase
    .from("client_contracts")
    .select("*")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("client_id", clientId)
    .order("contract_end_date", { ascending: true, nullsFirst: false });

  if (error || !data) return { rows: [] };
  return { rows: data as ClientContract[] };
}

export async function loadContractsForOwner(): Promise<{
  rows: ClientContractWithClient[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("client_contracts")
    .select("*, clients(legal_name, trade_name)")
    .eq("owner_user_id", workspaceOwnerId)
    .order("contract_end_date", { ascending: true, nullsFirst: false });

  if (error || !data) return { rows: [] };
  return { rows: data as ClientContractWithClient[] };
}

/** Returns contracts expiring within `withinDays` days from today. */
export async function loadExpiringContracts(
  withinDays = 60,
): Promise<{ rows: ContractAlertRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + withinDays);
  const limitStr = limitDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("client_contracts")
    .select("*, clients(legal_name, trade_name)")
    .eq("owner_user_id", workspaceOwnerId)
    .gte("contract_end_date", todayStr)
    .lte("contract_end_date", limitStr)
    .order("contract_end_date", { ascending: true });

  if (error || !data) return { rows: [] };

  const rows = (data as ClientContractWithClient[]).map((c) => {
    const end = new Date(`${c.contract_end_date!}T12:00:00Z`);
    const diff = Math.round(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return { ...c, days_until_expiry: Math.max(0, diff) } as ContractAlertRow;
  });

  return { rows };
}

// ── mutations ─────────────────────────────────────────────────────────────────

export async function createContractAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const clientId = String(formData.get("client_id") ?? "").trim();
  const recurrenceRaw = String(formData.get("billing_recurrence") ?? "").trim();
  const amountRaw = String(formData.get("monthly_amount") ?? "");
  const startRaw = String(formData.get("contract_start_date") ?? "");
  const endRaw = String(formData.get("contract_end_date") ?? "");
  const alertDays = parseInt(
    String(formData.get("alert_days_before") ?? "30"),
    10,
  );
  const notes = String(formData.get("notes") ?? "").trim();

  if (!clientId || !isValidRecurrence(recurrenceRaw)) {
    redirect(`/clientes/${clientId}/editar?contractErr=invalid`);
  }

  const { data: clientOk } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();
  if (!clientOk) redirect(`/clientes/${clientId}/editar?contractErr=client`);

  const amountCents = amountRaw ? parseAmountCents(amountRaw) : null;
  const startDate = startRaw ? parseDate(startRaw) : null;
  const endDate = endRaw ? parseDate(endRaw) : null;

  const { error } = await supabase.from("client_contracts").insert({
    owner_user_id: workspaceOwnerId,
    client_id: clientId,
    billing_recurrence: recurrenceRaw as BillingRecurrence,
    monthly_amount_cents: amountCents,
    contract_start_date: startDate,
    contract_end_date: endDate,
    alert_days_before: Number.isFinite(alertDays) ? alertDays : 30,
    notes: notes || null,
  });

  if (error) {
    redirect(`/clientes/${clientId}/editar?contractErr=save`);
  }

  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath("/financeiro");
  revalidatePath("/inicio");
  redirect(`/clientes/${clientId}/editar?tab=contratos`);
}

export async function updateContractAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const contractId = String(formData.get("contract_id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const recurrenceRaw = String(formData.get("billing_recurrence") ?? "").trim();
  const amountRaw = String(formData.get("monthly_amount") ?? "");
  const startRaw = String(formData.get("contract_start_date") ?? "");
  const endRaw = String(formData.get("contract_end_date") ?? "");
  const alertDays = parseInt(
    String(formData.get("alert_days_before") ?? "30"),
    10,
  );
  const notes = String(formData.get("notes") ?? "").trim();

  if (!contractId || !clientId || !isValidRecurrence(recurrenceRaw)) {
    redirect(`/clientes/${clientId}/editar?contractErr=invalid&tab=contratos`);
  }

  const amountCents = amountRaw ? parseAmountCents(amountRaw) : null;
  const startDate = startRaw ? parseDate(startRaw) : null;
  const endDate = endRaw ? parseDate(endRaw) : null;

  const { error } = await supabase
    .from("client_contracts")
    .update({
      billing_recurrence: recurrenceRaw as BillingRecurrence,
      monthly_amount_cents: amountCents,
      contract_start_date: startDate,
      contract_end_date: endDate,
      alert_days_before: Number.isFinite(alertDays) ? alertDays : 30,
      notes: notes || null,
    })
    .eq("id", contractId)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    redirect(`/clientes/${clientId}/editar?contractErr=save&tab=contratos`);
  }

  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath("/financeiro");
  revalidatePath("/inicio");
  redirect(`/clientes/${clientId}/editar?tab=contratos`);
}

export async function deleteContractAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const contractId = String(formData.get("contract_id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();

  if (!contractId || !clientId) {
    redirect(`/clientes/${clientId}/editar?contractErr=invalid&tab=contratos`);
  }

  const { error } = await supabase
    .from("client_contracts")
    .delete()
    .eq("id", contractId)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    redirect(`/clientes/${clientId}/editar?contractErr=save&tab=contratos`);
  }

  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath("/financeiro");
  revalidatePath("/inicio");
  redirect(`/clientes/${clientId}/editar?tab=contratos`);
}
