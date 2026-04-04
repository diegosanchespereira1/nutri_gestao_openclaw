export type FinancialChargeStatus = "open" | "paid";

export type FinancialChargeListRow = {
  id: string;
  description: string;
  amount_cents: number;
  due_date: string;
  status: FinancialChargeStatus;
  paid_at: string | null;
  clients: {
    legal_name: string;
    trade_name: string | null;
  } | null;
};
