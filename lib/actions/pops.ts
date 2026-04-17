"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isPopDraftUnchanged } from "@/lib/pops/pop-content-compare";
import { nextPopVersionNumber } from "@/lib/pops/next-pop-version";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentType } from "@/lib/types/establishments";
import type {
  EstablishmentPopListItem,
  EstablishmentPopRow,
  PopVersionRow,
} from "@/lib/types/pops";

const titleSchema = z.string().trim().min(1).max(300);
const bodySchema = z.string().min(1).max(50_000);

async function assertEstablishmentAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  establishmentId: string,
  userId: string,
): Promise<
  | { ok: true; establishment_type: EstablishmentType }
  | { ok: false; error: string }
> {
  const { data: est, error } = await supabase
    .from("establishments")
    .select("id, establishment_type, client_id")
    .eq("id", establishmentId)
    .maybeSingle();

  if (error || !est) {
    return { ok: false, error: "Estabelecimento não encontrado." };
  }

  const { data: c } = await supabase
    .from("clients")
    .select("owner_user_id, kind")
    .eq("id", est.client_id as string)
    .maybeSingle();

  if (!c || (c.owner_user_id as string) !== userId) {
    return { ok: false, error: "Sem permissão para este estabelecimento." };
  }
  if ((c.kind as string) !== "pj") {
    return {
      ok: false,
      error: "POPs neste módulo aplicam-se a estabelecimentos de clientes PJ.",
    };
  }

  return {
    ok: true,
    establishment_type: est.establishment_type as EstablishmentType,
  };
}

export async function loadPopsForEstablishmentAction(
  establishmentId: string,
): Promise<{ rows: EstablishmentPopListItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const gate = await assertEstablishmentAccess(supabase, establishmentId, user.id);
  if (!gate.ok) return { rows: [] };

  const { data: pops, error: pErr } = await supabase
    .from("establishment_pops")
    .select("id, establishment_id, title, source_template_id, created_at, updated_at")
    .eq("establishment_id", establishmentId)
    .order("updated_at", { ascending: false });

  if (pErr || !pops?.length) return { rows: [] };

  const ids = pops.map((p) => p.id as string);
  const { data: vers, error: vErr } = await supabase
    .from("pop_versions")
    .select("pop_id, version_number")
    .in("pop_id", ids);

  if (vErr) {
    return {
      rows: pops.map((p) => ({
        id: p.id as string,
        establishment_id: p.establishment_id as string,
        title: String(p.title),
        source_template_id:
          p.source_template_id != null ? String(p.source_template_id) : null,
        created_at: String(p.created_at),
        updated_at: String(p.updated_at),
        latest_version_number: 0,
      })),
    };
  }

  const maxByPop = new Map<string, number>();
  for (const v of vers ?? []) {
    const pid = v.pop_id as string;
    const n = Number(v.version_number);
    const cur = maxByPop.get(pid) ?? 0;
    if (n > cur) maxByPop.set(pid, n);
  }

  return {
    rows: pops.map((p) => {
      const id = p.id as string;
      return {
        id,
        establishment_id: p.establishment_id as string,
        title: String(p.title),
        source_template_id:
          p.source_template_id != null ? String(p.source_template_id) : null,
        created_at: String(p.created_at),
        updated_at: String(p.updated_at),
        latest_version_number: maxByPop.get(id) ?? 0,
      };
    }),
  };
}

export type PopWithVersionsResult =
  | {
      ok: true;
      pop: EstablishmentPopRow;
      versions: PopVersionRow[];
      latest: PopVersionRow | null;
    }
  | { ok: false; error: string };

export async function loadPopWithVersionsAction(
  popId: string,
): Promise<PopWithVersionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: pop, error: pErr } = await supabase
    .from("establishment_pops")
    .select("id, establishment_id, title, source_template_id, created_at, updated_at")
    .eq("id", popId)
    .maybeSingle();

  if (pErr || !pop) return { ok: false, error: "POP não encontrado." };

  const gate = await assertEstablishmentAccess(
    supabase,
    pop.establishment_id as string,
    user.id,
  );
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: vers, error: vErr } = await supabase
    .from("pop_versions")
    .select("id, pop_id, version_number, title, body, created_at")
    .eq("pop_id", popId)
    .order("version_number", { ascending: true });

  if (vErr) return { ok: false, error: "Erro ao carregar versões." };

  const versions: PopVersionRow[] = (vers ?? []).map((v) => ({
    id: String(v.id),
    pop_id: String(v.pop_id),
    version_number: Number(v.version_number),
    title: String(v.title),
    body: String(v.body),
    created_at: String(v.created_at),
  }));

  const latest =
    versions.length > 0 ? versions[versions.length - 1]! : null;

  return {
    ok: true,
    pop: {
      id: String(pop.id),
      establishment_id: String(pop.establishment_id),
      title: String(pop.title),
      source_template_id:
        pop.source_template_id != null ? String(pop.source_template_id) : null,
      created_at: String(pop.created_at),
      updated_at: String(pop.updated_at),
    },
    versions,
    latest,
  };
}

export async function createPopFromTemplateAction(input: {
  establishmentId: string;
  templateId: string;
}): Promise<{ ok: true; popId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const gate = await assertEstablishmentAccess(
    supabase,
    input.establishmentId,
    user.id,
  );
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: tpl, error: tErr } = await supabase
    .from("pop_templates")
    .select("id, establishment_type, name, body")
    .eq("id", input.templateId)
    .maybeSingle();

  if (tErr || !tpl) {
    return { ok: false, error: "Modelo não encontrado." };
  }

  if ((tpl.establishment_type as string) !== gate.establishment_type) {
    return {
      ok: false,
      error: "O modelo não corresponde ao tipo deste estabelecimento.",
    };
  }

  const title = String(tpl.name);
  const body = String(tpl.body);

  const { data: inserted, error: iErr } = await supabase
    .from("establishment_pops")
    .insert({
      establishment_id: input.establishmentId,
      title,
      source_template_id: tpl.id as string,
    })
    .select("id")
    .single();

  if (iErr || !inserted) {
    return { ok: false, error: "Não foi possível criar o POP." };
  }

  const popId = (inserted as { id: string }).id;

  const { error: vErr } = await supabase.from("pop_versions").insert({
    pop_id: popId,
    version_number: 1,
    title,
    body,
  });

  if (vErr) {
    await supabase.from("establishment_pops").delete().eq("id", popId);
    return { ok: false, error: "Não foi possível criar a primeira versão." };
  }

  revalidatePath("/pops");
  revalidatePath(`/pops/estabelecimento/${input.establishmentId}`);
  return { ok: true, popId };
}

const blankBody =
  "1. Objetivo\n(descreva o objetivo do procedimento)\n\n2. Âmbito\n(quem deve cumprir e quando)\n\n3. Passos\n(detaihe o passo a passo)\n\n4. Registos\n(o que documentar e onde)";

export async function createBlankPopAction(input: {
  establishmentId: string;
  title: string;
}): Promise<{ ok: true; popId: string } | { ok: false; error: string }> {
  const parsed = titleSchema.safeParse(input.title);
  if (!parsed.success) {
    return { ok: false, error: "Título inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const gate = await assertEstablishmentAccess(
    supabase,
    input.establishmentId,
    user.id,
  );
  if (!gate.ok) return { ok: false, error: gate.error };

  const title = parsed.data;

  const { data: inserted, error: iErr } = await supabase
    .from("establishment_pops")
    .insert({
      establishment_id: input.establishmentId,
      title,
      source_template_id: null,
    })
    .select("id")
    .single();

  if (iErr || !inserted) {
    return { ok: false, error: "Não foi possível criar o POP." };
  }

  const popId = (inserted as { id: string }).id;

  const { error: vErr } = await supabase.from("pop_versions").insert({
    pop_id: popId,
    version_number: 1,
    title,
    body: blankBody,
  });

  if (vErr) {
    await supabase.from("establishment_pops").delete().eq("id", popId);
    return { ok: false, error: "Não foi possível criar a primeira versão." };
  }

  revalidatePath("/pops");
  revalidatePath(`/pops/estabelecimento/${input.establishmentId}`);
  return { ok: true, popId };
}

export async function savePopNewVersionAction(input: {
  popId: string;
  title: string;
  body: string;
}): Promise<
  | { ok: true; versionNumber: number; unchanged: boolean }
  | { ok: false; error: string }
> {
  const titleP = titleSchema.safeParse(input.title);
  const bodyP = bodySchema.safeParse(input.body);
  if (!titleP.success || !bodyP.success) {
    return { ok: false, error: "Título ou conteúdo inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: pop, error: pErr } = await supabase
    .from("establishment_pops")
    .select("id, establishment_id")
    .eq("id", input.popId)
    .maybeSingle();

  if (pErr || !pop) return { ok: false, error: "POP não encontrado." };

  const gate = await assertEstablishmentAccess(
    supabase,
    pop.establishment_id as string,
    user.id,
  );
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: latestRow } = await supabase
    .from("pop_versions")
    .select("version_number, title, body")
    .eq("pop_id", input.popId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRow) {
    return { ok: false, error: "POP sem versões guardadas." };
  }

  const currentNum = Number(latestRow.version_number);
  if (
    isPopDraftUnchanged(
      String(latestRow.title),
      String(latestRow.body),
      titleP.data,
      bodyP.data,
    )
  ) {
    return { ok: true, versionNumber: currentNum, unchanged: true };
  }

  const { data: existing } = await supabase
    .from("pop_versions")
    .select("version_number")
    .eq("pop_id", input.popId);

  const nums = (existing ?? []).map((r) => Number(r.version_number));
  const next = nextPopVersionNumber(nums);

  const { error: insErr } = await supabase.from("pop_versions").insert({
    pop_id: input.popId,
    version_number: next,
    title: titleP.data,
    body: bodyP.data,
  });

  if (insErr) {
    return { ok: false, error: "Não foi possível salvar a nova versão." };
  }

  const { error: uErr } = await supabase
    .from("establishment_pops")
    .update({ title: titleP.data })
    .eq("id", input.popId);

  if (uErr) {
    return { ok: false, error: "Versão guardada; falhou atualizar título do documento." };
  }

  const estId = pop.establishment_id as string;
  revalidatePath("/pops");
  revalidatePath(`/pops/estabelecimento/${estId}`);
  revalidatePath(`/pops/${input.popId}/editar`);
  revalidatePath(`/pops/${input.popId}/historico`);

  return { ok: true, versionNumber: next, unchanged: false };
}

export async function deletePopAction(
  popId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: pop, error: pErr } = await supabase
    .from("establishment_pops")
    .select("id, establishment_id")
    .eq("id", popId)
    .maybeSingle();

  if (pErr || !pop) return { ok: false, error: "POP não encontrado." };

  const estId = pop.establishment_id as string;
  const gate = await assertEstablishmentAccess(supabase, estId, user.id);
  if (!gate.ok) return { ok: false, error: gate.error };

  const { error } = await supabase.from("establishment_pops").delete().eq("id", popId);
  if (error) return { ok: false, error: "Não foi possível eliminar." };

  revalidatePath("/pops");
  revalidatePath(`/pops/estabelecimento/${estId}`);
  return { ok: true };
}
