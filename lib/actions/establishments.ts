"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseEstablishmentType } from "@/lib/constants/establishment-types";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentRow, EstablishmentWithClientNames } from "@/lib/types/establishments";

export type EstablishmentFormResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateClientEstablishmentPaths(clientId: string, estId?: string) {
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath(`/clientes/${clientId}/estabelecimentos/novo`);
  if (estId) {
    revalidatePath(
      `/clientes/${clientId}/estabelecimentos/${estId}/editar`,
    );
  }
}

/** Todos os estabelecimentos do profissional (via clientes PJ próprios), para filtros globais. */
export async function loadEstablishmentsForOwner(): Promise<{
  rows: EstablishmentWithClientNames[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data: clientRows, error: cErr } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("kind", "pj");

  if (cErr || !clientRows?.length) return { rows: [] };

  const clientIds = clientRows.map((c) => c.id as string);

  const { data, error } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as EstablishmentWithClientNames[] };
}

export async function loadEstablishmentsForClient(
  clientId: string,
): Promise<{ rows: EstablishmentRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as EstablishmentRow[] };
}

export async function createEstablishmentAction(
  _prev: EstablishmentFormResult | undefined,
  formData: FormData,
): Promise<EstablishmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!clientId) {
    return { ok: false, error: "Cliente em falta." };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, kind, owner_user_id")
    .eq("id", clientId)
    .maybeSingle();

  if (
    !clientRow ||
    clientRow.owner_user_id !== user.id ||
    clientRow.kind !== "pj"
  ) {
    return {
      ok: false,
      error: "Só é possível criar estabelecimentos para clientes PJ da sua conta.",
    };
  }

  const establishment_type = parseEstablishmentType(
    formData.get("establishment_type"),
  );
  if (!establishment_type) {
    return { ok: false, error: "Selecione o tipo de estabelecimento." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Indique o nome do estabelecimento." };
  }

  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  if (!address_line1) {
    return { ok: false, error: "Indique a morada (linha 1)." };
  }

  const address_line2Raw = String(formData.get("address_line2") ?? "").trim();
  const address_line2 =
    address_line2Raw.length > 0 ? address_line2Raw : null;

  const cityRaw = String(formData.get("city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const stateRaw = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase();
  if (stateRaw.length > 0 && stateRaw.length !== 2) {
    return { ok: false, error: "UF deve ter 2 letras (ex.: SP)." };
  }
  const state = stateRaw.length === 2 ? stateRaw : null;

  const postalRaw = String(formData.get("postal_code") ?? "").trim();
  const postal_code = postalRaw.length > 0 ? postalRaw : null;

  const { data, error } = await supabase
    .from("establishments")
    .insert({
      client_id: clientId,
      name,
      establishment_type,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível criar o estabelecimento." };
  }

  revalidateClientEstablishmentPaths(clientId, data.id);
  redirect(`/clientes/${clientId}/editar`);
}

export async function updateEstablishmentAction(
  _prev: EstablishmentFormResult | undefined,
  formData: FormData,
): Promise<EstablishmentFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!id || !clientId) {
    return { ok: false, error: "Dados em falta." };
  }

  const establishment_type = parseEstablishmentType(
    formData.get("establishment_type"),
  );
  if (!establishment_type) {
    return { ok: false, error: "Selecione o tipo de estabelecimento." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Indique o nome do estabelecimento." };
  }

  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  if (!address_line1) {
    return { ok: false, error: "Indique a morada (linha 1)." };
  }

  const address_line2Raw = String(formData.get("address_line2") ?? "").trim();
  const address_line2 =
    address_line2Raw.length > 0 ? address_line2Raw : null;

  const cityRaw = String(formData.get("city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const stateRaw = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase();
  if (stateRaw.length > 0 && stateRaw.length !== 2) {
    return { ok: false, error: "UF deve ter 2 letras (ex.: SP)." };
  }
  const state = stateRaw.length === 2 ? stateRaw : null;

  const postalRaw = String(formData.get("postal_code") ?? "").trim();
  const postal_code = postalRaw.length > 0 ? postalRaw : null;

  const { error } = await supabase
    .from("establishments")
    .update({
      name,
      establishment_type,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
    })
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) {
    return { ok: false, error: "Não foi possível guardar as alterações." };
  }

  revalidateClientEstablishmentPaths(clientId, id);
  return { ok: true };
}

export async function deleteEstablishmentAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!id || !clientId) {
    redirect("/clientes");
  }

  const { count, error: countErr } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("establishment_id", id);

  if (!countErr && (count ?? 0) > 0) {
    redirect(
      `/clientes/${clientId}/estabelecimentos/${id}/editar?blocked=patients`,
    );
  }

  await supabase
    .from("establishments")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);

  revalidatePath("/pacientes");
  revalidateClientEstablishmentPaths(clientId);
  redirect(`/clientes/${clientId}/editar`);
}
