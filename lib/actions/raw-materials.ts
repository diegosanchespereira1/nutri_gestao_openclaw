"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { createClient } from "@/lib/supabase/server";
import { getServerContext } from "@/lib/supabase/get-server-user";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import { countRecipesUsingRawMaterial } from "@/lib/technical-recipes/raw-material-recipe-impact";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { logRawMaterialChange } from "@/lib/actions/raw-material-history";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(300),
  price_unit: z.enum(RECIPE_LINE_UNITS),
  unit_price_brl: z.preprocess(
    (v) =>
      typeof v === "string" ? v.trim().replace(/\s/g, "").replace(",", ".") : v,
    z.coerce.number().positive("Preço deve ser maior que zero."),
  ),
  notes: z.string().max(2000).optional(),
  client_id: z.string().uuid().optional(),
  establishment_id: z.string().uuid().optional(),
});

function mapRow(r: Record<string, unknown>): RawMaterialRow {
  return {
    id: String(r.id),
    owner_user_id: String(r.owner_user_id),
    name: String(r.name),
    price_unit: r.price_unit as RecipeLineUnit,
    unit_price_brl: Number(r.unit_price_brl),
    notes: r.notes != null ? String(r.notes) : null,
    client_id: r.client_id != null ? String(r.client_id) : null,
    establishment_id: r.establishment_id != null ? String(r.establishment_id) : null,
    contexto: r.contexto != null ? (String(r.contexto) as RawMaterialRow["contexto"]) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function loadRawMaterialsForOwner(opts?: {
  q?: string;
}): Promise<{
  rows: RawMaterialRow[];
}> {
  // getServerContext() lê workspaceOwnerId do cookie — evita round-trip ao
  // Supabase Auth e query à tabela team_members.
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return { rows: [] };

  const q = opts?.q?.trim() ?? "";

  let query = supabase
    .from("professional_raw_materials")
    .select("*")
    .eq("owner_user_id", workspaceOwnerId)
    .order("name", { ascending: true });

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error || !data) return { rows: [] };
  return { rows: data.map((row) => mapRow(row as Record<string, unknown>)) };
}

/**
 * Matérias-primas visíveis para uma receita de um determinado âmbito — usado
 * pelo seletor de ingredientes em recipe-form.tsx. Nunca mistura clientes:
 * um item de repositório só aparece para o MESMO client_id, nunca para outro
 * cliente do tenant. Itens legados (client_id nulo, ainda não migrados) ficam
 * visíveis em qualquer âmbito até serem reatribuídos.
 *
 * - Receita de estabelecimento: itens desse estabelecimento + repositório do
 *   mesmo cliente (padrão herdado por todos os estabelecimentos dele).
 * - Receita de repositório (sem estabelecimento): só itens de repositório do
 *   mesmo cliente — não faz sentido puxar item de um estabelecimento
 *   específico para um modelo reutilizável em vários estabelecimentos.
 */
export async function loadRawMaterialsForScope(input: {
  clientId?: string;
  establishmentId?: string;
}): Promise<{ rows: RawMaterialRow[] }> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return { rows: [] };

  const clientId = input.clientId?.trim() || null;
  const establishmentId = input.establishmentId?.trim() || null;

  let query = supabase
    .from("professional_raw_materials")
    .select("*")
    .eq("owner_user_id", workspaceOwnerId)
    .order("name", { ascending: true });

  if (clientId && establishmentId) {
    query = query.or(
      `client_id.is.null,establishment_id.eq.${establishmentId},and(client_id.eq.${clientId},establishment_id.is.null)`,
    );
  } else if (clientId) {
    query = query.or(
      `client_id.is.null,and(client_id.eq.${clientId},establishment_id.is.null)`,
    );
  }
  // Sem cliente/estabelecimento definido ainda (ex.: formulário recém-aberto
  // sem seleção): devolve tudo, igual ao comportamento anterior.

  const { data, error } = await query;
  if (error || !data) return { rows: [] };
  return { rows: data.map((row) => mapRow(row as Record<string, unknown>)) };
}

export async function loadRawMaterialById(
  id: string,
): Promise<{ row: RawMaterialRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("professional_raw_materials")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  if (error || !data) return { row: null };
  return { row: mapRow(data as Record<string, unknown>) };
}

export type RawMaterialInlineResult =
  | { ok: true; row: RawMaterialRow }
  | { ok: false; error: string };

const inlineCreateSchema = saveSchema.omit({ id: true });

/**
 * Variante de criação que NUNCA navega (sem `redirect()`), pensada para o
 * painel de criação aberto de dentro do formulário de receita — o usuário
 * não pode perder o que já digitou na receita. Retorna a linha criada para o
 * chamador atualizar a lista local sem precisar recarregar nada.
 *
 * A validação de posse de cliente/estabelecimento é intencionalmente
 * duplicada de saveRawMaterialAction (em vez de compartilhar um helper) —
 * aquela função usa `redirect()` em cada ramo de erro, o que não serve aqui.
 */
export async function createRawMaterialInlineAction(
  _prev: RawMaterialInlineResult | undefined,
  formData: FormData,
): Promise<RawMaterialInlineResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const parsed = inlineCreateSchema.safeParse({
    name: formData.get("name"),
    price_unit: formData.get("price_unit"),
    unit_price_brl: formData.get("unit_price_brl"),
    notes: formData.get("notes"),
    client_id: formData.get("client_id") || undefined,
    establishment_id: formData.get("establishment_id") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Confira os campos preenchidos e tente novamente." };
  }

  const { name, price_unit, unit_price_brl, notes } = parsed.data;
  let { client_id: clientId, establishment_id: establishmentId } = parsed.data;
  const notesVal = notes?.trim() ? notes.trim() : null;

  // Nunca confia no client_id/establishment_id do formulário — mesma
  // revalidação de posse feita em saveRawMaterialAction.
  if (establishmentId) {
    const { data: estRow } = await supabase
      .from("establishments")
      .select("id, client_id")
      .eq("id", establishmentId)
      .maybeSingle();
    if (!estRow) return { ok: false, error: "Estabelecimento inválido." };
    const { data: estClientRow } = await supabase
      .from("clients")
      .select("owner_user_id, kind")
      .eq("id", (estRow as { client_id: string }).client_id)
      .maybeSingle();
    if (
      !estClientRow ||
      estClientRow.owner_user_id !== workspaceOwnerId ||
      estClientRow.kind !== "pj"
    ) {
      return { ok: false, error: "Estabelecimento inválido." };
    }
    clientId = (estRow as { client_id: string }).client_id;
  } else if (clientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("owner_user_id, kind")
      .eq("id", clientId)
      .maybeSingle();
    if (
      !clientRow ||
      clientRow.owner_user_id !== workspaceOwnerId ||
      clientRow.kind !== "pj"
    ) {
      return { ok: false, error: "Cliente inválido." };
    }
  }

  const { data, error } = await supabase
    .from("professional_raw_materials")
    .insert({
      owner_user_id: workspaceOwnerId,
      name: name.trim(),
      price_unit,
      unit_price_brl,
      notes: notesVal,
      ...(clientId
        ? {
            client_id: clientId,
            establishment_id: establishmentId ?? null,
            contexto: establishmentId ? "ESTABELECIMENTO" : "REPOSITORIO",
          }
        : {}),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[raw-materials] createRawMaterialInlineAction falhou", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    const message =
      error?.code === "23505"
        ? "Já existe uma matéria-prima com esse nome neste âmbito."
        : error?.code === "42703" || error?.code === "PGRST204"
          ? "O banco de dados local está desatualizado — falta aplicar a migração de client_id/establishment_id (rode `npx supabase db reset` ou `npx supabase migration up`)."
          : error?.code === "42501"
            ? "Sem permissão para criar esta matéria-prima neste cliente/estabelecimento."
            : "Não foi possível salvar. Tente novamente.";
    return { ok: false, error: message };
  }

  revalidatePath("/materias-primas");
  revalidatePath("/ficha-tecnica");

  return { ok: true, row: mapRow(data as Record<string, unknown>) };
}

export async function saveRawMaterialAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const formId = String(formData.get("id") ?? "").trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    formId,
  );

  const parsed = saveSchema.safeParse({
    id: formId.length > 0 && isUuid ? formId : undefined,
    name: formData.get("name"),
    price_unit: formData.get("price_unit"),
    unit_price_brl: formData.get("unit_price_brl"),
    notes: formData.get("notes"),
    client_id: formData.get("client_id") || undefined,
    establishment_id: formData.get("establishment_id") || undefined,
  });

  if (!parsed.success) {
    if (isUuid) {
      redirect(`/materias-primas/${formId}/editar?err=invalid`);
    }
    redirect("/materias-primas/nova?err=invalid");
  }

  const { id, name, price_unit, unit_price_brl, notes } = parsed.data;
  let { client_id: clientId, establishment_id: establishmentId } = parsed.data;
  const notesVal = notes?.trim() ? notes.trim() : null;

  // Estabelecimento sempre implica o cliente dele — nunca confia no client_id
  // do formulário quando establishment_id também veio preenchido (o trigger
  // de banco também deriva isso, mas validamos aqui para dar um erro claro em
  // vez de deixar a constraint do banco estourar).
  if (establishmentId) {
    const { data: estRow } = await supabase
      .from("establishments")
      .select("id, client_id")
      .eq("id", establishmentId)
      .maybeSingle();
    if (!estRow) {
      redirect(
        id ? `/materias-primas/${id}/editar?err=invalid` : "/materias-primas/nova?err=invalid",
      );
    }
    const { data: estClientRow } = await supabase
      .from("clients")
      .select("owner_user_id, kind")
      .eq("id", (estRow as { client_id: string }).client_id)
      .maybeSingle();
    if (
      !estClientRow ||
      estClientRow.owner_user_id !== workspaceOwnerId ||
      estClientRow.kind !== "pj"
    ) {
      redirect(
        id ? `/materias-primas/${id}/editar?err=invalid` : "/materias-primas/nova?err=invalid",
      );
    }
    clientId = (estRow as { client_id: string }).client_id;
  } else if (clientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("owner_user_id, kind")
      .eq("id", clientId)
      .maybeSingle();
    if (
      !clientRow ||
      clientRow.owner_user_id !== workspaceOwnerId ||
      clientRow.kind !== "pj"
    ) {
      redirect(
        id ? `/materias-primas/${id}/editar?err=invalid` : "/materias-primas/nova?err=invalid",
      );
    }
  }

  if (id) {
    const { data: beforeRow } = await supabase
      .from("professional_raw_materials")
      .select("name, price_unit, unit_price_brl, notes, client_id, establishment_id")
      .eq("id", id)
      .eq("owner_user_id", workspaceOwnerId)
      .maybeSingle();

    // Âmbito (cliente/estabelecimento) só pode ser definido uma vez — depois
    // de escopada, a matéria-prima não muda de cliente por aqui (mesma regra
    // de technical_recipes). Item legado (client_id nulo) aceita a primeira
    // atribuição normalmente.
    const existingClientId = beforeRow?.client_id
      ? String(beforeRow.client_id)
      : null;
    const updatePayload: Record<string, unknown> = {
      name: name.trim(),
      price_unit,
      unit_price_brl,
      notes: notesVal,
    };
    if (existingClientId == null && clientId) {
      updatePayload.client_id = clientId;
      updatePayload.establishment_id = establishmentId ?? null;
      updatePayload.contexto = establishmentId ? "ESTABELECIMENTO" : "REPOSITORIO";
    }

    const { error } = await supabase
      .from("professional_raw_materials")
      .update(updatePayload)
      .eq("id", id)
      .eq("owner_user_id", workspaceOwnerId);

    if (error) {
      redirect(
        `/materias-primas/${id}/editar?err=save`,
      );
    }

    if (beforeRow) {
      await logRawMaterialChange({
        supabase,
        ownerUserId: workspaceOwnerId,
        actorUserId: user.id,
        rawMaterialId: id,
        before: {
          name: String(beforeRow.name),
          price_unit: String(beforeRow.price_unit),
          unit_price_brl: Number(beforeRow.unit_price_brl),
          notes: beforeRow.notes != null ? String(beforeRow.notes) : null,
        },
        after: {
          name: name.trim(),
          price_unit,
          unit_price_brl,
          notes: notesVal,
        },
        source: "manual_edit",
      });
    }

    const { data: lineRows } = await supabase
      .from("technical_recipe_lines")
      .select("recipe_id")
      .eq("raw_material_id", id);
    const recipeIds = [
      ...new Set((lineRows ?? []).map((r) => r.recipe_id as string)),
    ];
    for (const rid of recipeIds) {
      revalidatePath(`/ficha-tecnica/${rid}/editar`);
    }

    const affectedRecipes = await countRecipesUsingRawMaterial(supabase, id);
    revalidatePath("/materias-primas");
    revalidatePath(`/materias-primas/${id}/editar`);
    revalidatePath("/ficha-tecnica");
    redirect(
      `/materias-primas?priceUpdated=1&recipes=${affectedRecipes}`,
    );
  }

  const { error } = await supabase.from("professional_raw_materials").insert({
    owner_user_id: workspaceOwnerId,
    name: name.trim(),
    price_unit,
    unit_price_brl,
    notes: notesVal,
    ...(clientId
      ? {
          client_id: clientId,
          establishment_id: establishmentId ?? null,
          contexto: establishmentId ? "ESTABELECIMENTO" : "REPOSITORIO",
        }
      : {}),
  });

  if (error) {
    redirect("/materias-primas/nova?err=save");
  }

  revalidatePath("/materias-primas");
  revalidatePath("/ficha-tecnica");
  redirect("/materias-primas");
}

export type DeleteRawMaterialResult = { ok: true } | { ok: false; error: string };

/**
 * Apaga uma matéria-prima. Chamada diretamente pelo client component de
 * confirmação (AlertDialog) — não usa FormData/redirect porque a confirmação
 * já acontece antes, no diálogo (ver components/technical-sheets/delete-raw-material-button.tsx).
 */
export async function deleteRawMaterialAction(
  id: string,
): Promise<DeleteRawMaterialResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  if (!id.trim()) return { ok: false, error: "Pedido inválido." };

  const { data: lineRowsDel } = await supabase
    .from("technical_recipe_lines")
    .select("recipe_id")
    .eq("raw_material_id", id);
  const recipeIdsDel = [
    ...new Set((lineRowsDel ?? []).map((r) => r.recipe_id as string)),
  ];

  const { error } = await supabase
    .from("professional_raw_materials")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    return { ok: false, error: "Não foi possível apagar. Tente novamente." };
  }

  for (const rid of recipeIdsDel) {
    revalidatePath(`/ficha-tecnica/${rid}/editar`);
  }

  revalidatePath("/materias-primas");
  revalidatePath("/ficha-tecnica");

  return { ok: true };
}
