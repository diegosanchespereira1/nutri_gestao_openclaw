export type FinancialChargeStatus = "open" | "paid";

export type FinancialChargeListRow = {
  id: string;
  client_id: string;
  description: string;
  category: string | null;
  amount_cents: number;
  due_date: string;
  is_recurring: boolean;
  recurrence_ends_on: string | null;
  status: FinancialChargeStatus;
  paid_at: string | null;
  created_at: string;
  clients: {
    legal_name: string;
    trade_name: string | null;
  } | null;
};
