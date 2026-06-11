import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CLIENT_ROW_FULL_SELECT } from "@/lib/clientes/client-row-supabase-select";
import { normalizeClientRow } from "@/lib/clientes/normalize-client-row";
import type { ClientRow } from "@/lib/types/clients";

/** Linha completa para o formulário da aba Dados em `/clientes/[id]/editar`. */
export async function loadFullClientRowForEdit(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_ROW_FULL_SELECT)
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data) notFound();
  return normalizeClientRow(data as unknown as Record<string, unknown>);
}
