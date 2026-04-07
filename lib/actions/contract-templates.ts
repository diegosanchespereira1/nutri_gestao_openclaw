"use server";

import { createClient } from "@/lib/supabase/server";
import type { BillingRecurrence } from "@/lib/types/client-contracts";

export type ContractTemplate = {
  id: string;
  owner_user_id: string | null;
  title: string;
  description: string | null;
  body_html: string;
  is_active: boolean;
  created_at: string;
};

export async function loadContractTemplates(): Promise<{
  rows: ContractTemplate[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("contract_templates")
    .select("id, owner_user_id, title, description, body_html, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as ContractTemplate[] };
}

// ── Variable interpolation ─────────────────────────────────────────────────

const RECURRENCE_LABELS: Record<BillingRecurrence, string> = {
  monthly: "Mensal",
  annual: "Anual",
  "one-time": "Avulso",
};

function formatCentsAsBRL(cents: number | null): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export type ContractRenderVars = {
  client_name: string;
  professional_name: string;
  professional_crn: string;
  contract_start: string;
  contract_end: string;
  billing_recurrence: string;
  monthly_amount: string;
  date: string;
};

export function renderContractTemplate(
  bodyHtml: string,
  vars: ContractRenderVars,
): string {
  let result = bodyHtml;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function generateContractHtml(opts: {
  templateId: string;
  clientName: string;
  billingRecurrence: BillingRecurrence;
  monthlyAmountCents: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
}): Promise<{ html: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { html: null, error: "Não autenticado." };

  // Load template (global or own)
  const { data: tpl } = await supabase
    .from("contract_templates")
    .select("body_html, is_active")
    .eq("id", opts.templateId)
    .maybeSingle();

  if (!tpl || !tpl.is_active) {
    return { html: null, error: "Modelo não encontrado ou inativo." };
  }

  // Load professional name + CRN from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn")
    .eq("id", user.id)
    .maybeSingle();

  const todayBR = formatDateBR(new Date().toISOString().slice(0, 10));
  const vars: ContractRenderVars = {
    client_name: opts.clientName,
    professional_name: profile?.full_name ?? "Profissional",
    professional_crn: profile?.crn ?? "—",
    contract_start: formatDateBR(opts.contractStartDate),
    contract_end: formatDateBR(opts.contractEndDate),
    billing_recurrence: RECURRENCE_LABELS[opts.billingRecurrence],
    monthly_amount: formatCentsAsBRL(opts.monthlyAmountCents),
    date: todayBR,
  };

  const html = renderContractTemplate(tpl.body_html as string, vars);
  return { html, error: null };
}
