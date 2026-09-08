"use server";

import { revalidatePath } from "next/cache";

import { isReservedChargeCategoryLabel } from "@/lib/constants/financial-charge-category";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type FinancialChargeCustomCategory = {
  id: string;
  label: string;
};

export async function loadFinancialChargeCategoriesAction(): Promise<
  FinancialChargeCustomCategory[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data } = await supabase
    .from("financial_charge_categories")
    .select("id, label")
    .eq("owner_user_id", workspaceOwnerId)
    .order("label", { ascending: true });

  return (data ?? []) as FinancialChargeCustomCategory[];
}

export async function createFinancialChargeCategoryAction(
  label: string,
): Promise<
  | { ok: true; category: FinancialChargeCustomCategory }
  | { ok: false; error: string }
> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "O nome da categoria não pode estar vazio." };
  }
  if (trimmed.length > 80) {
    return {
      ok: false,
      error: "O nome da categoria deve ter no máximo 80 caracteres.",
    };
  }
  if (isReservedChargeCategoryLabel(trimmed)) {
    return {
      ok: false,
      error: "Essa categoria já existe nas opções padrão.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existingRows } = await supabase
    .from("financial_charge_categories")
    .select("id, label")
    .eq("owner_user_id", workspaceOwnerId);

  const existing = (existingRows ?? []).find(
    (row) => row.label.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    return { ok: true, category: existing as FinancialChargeCustomCategory };
  }

  const { data, error } = await supabase
    .from("financial_charge_categories")
    .insert({ label: trimmed, owner_user_id: workspaceOwnerId })
    .select("id, label")
    .single();

  if (error || !data) {
    return { ok: false, error: "Erro ao criar categoria. Tente novamente." };
  }

  revalidatePath("/financeiro");
  return { ok: true, category: data as FinancialChargeCustomCategory };
}
