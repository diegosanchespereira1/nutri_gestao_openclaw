export type BillingRecurrence = "monthly" | "annual" | "one-time";

export const BILLING_RECURRENCE_LABELS: Record<BillingRecurrence, string> = {
  monthly: "Mensal",
  annual: "Anual",
  "one-time": "Avulso",
};

export type ClientContract = {
  id: string;
  owner_user_id: string;
  client_id: string;
  billing_recurrence: BillingRecurrence;
  monthly_amount_cents: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  alert_days_before: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientContractWithClient = ClientContract & {
  clients: {
    legal_name: string;
    trade_name: string | null;
  } | null;
};

export type ContractAlertRow = ClientContractWithClient & {
  days_until_expiry: number;
};
