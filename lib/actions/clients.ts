"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appendClientExamUploads } from "@/lib/actions/client-exams";
import { normalizeClientRow } from "@/lib/clients/normalize-client-row";
import {
  deleteLogoAtPathIfAny,
  resolveClientLogoPathFromForm,
} from "@/lib/clients/logo-sync";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type {
  ClientBusinessSegment,
  ClientKind,
  ClientLifecycleStatus,
  ClientRow,
  ClientSocialLinks,
} from "@/lib/types/clients";
import type { PatientSex } from "@/lib/types/patients";
import {
  establishmentTypeFromSegment,
} from "@/lib/constants/establishment-types";
import {
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-document";

type PfProfileFields = {
  attended_full_name: string | null;
  birth_date: string | null;
  sex: PatientSex | null;
  dietary_restrictions: string | null;
  chronic_medications: string | null;
  guardian_full_name: string | null;
  guardian_document_id: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
};

function nullPfProfile(): PfProfileFields {
  return {
    attended_full_name: null,
    birth_date: null,
    sex: null,
    dietary_restrictions: null,
    chronic_medications: null,
    guardian_full_name: null,
    guardian_document_id: null,
    guardian_email: null,
    guardian_phone: null,
    guardian_relationship: null,
  };
}

function pfOnlyClearPayload() {
  return {
    lifecycle_status: "ativo" as const,
    business_segment: null,
    activated_at: null,
    state_registration: null,
    municipal_registration: null,
    sanitary_license: null,
    website_url: null,
    social_links: {} as ClientSocialLinks,
    legal_rep_full_name: null,
    legal_rep_document_id: null,
    legal_rep_role: null,
    legal_rep_email: null,
    legal_rep_phone: null,
    technical_rep_full_name: null,
    technical_rep_professional_id: null,
    technical_rep_email: null,
    technical_rep_phone: null,
  };
}

function parsePfProfile(formData: FormData, kind: ClientKind): PfProfileFields {
  if (kind !== "pf") return nullPfProfile();

  const attendedRaw = String(formData.get("attended_full_name") ?? "").trim();
  const attended_full_name =
    attendedRaw.length > 0 ? attendedRaw : null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const birth_date = birthRaw.length > 0 ? birthRaw : null;

  const sexRaw = String(formData.get("sex") ?? "").trim();
  const sex: PatientSex | null =
    sexRaw === "female" || sexRaw === "male" || sexRaw === "other"
      ? sexRaw
      : null;

  const dr = String(formData.get("dietary_restrictions") ?? "").trim();
  const dietary_restrictions = dr.length > 0 ? dr : null;

  const cm = String(formData.get("chronic_medications") ?? "").trim();
  const chronic_medications = cm.length > 0 ? cm : null;

  const gname = String(formData.get("guardian_full_name") ?? "").trim();
  const guardian_full_name = gname.length > 0 ? gname : null;

  const gdoc = String(formData.get("guardian_document_id") ?? "").trim();
  const guardian_document_id = gdoc.length > 0 ? gdoc : null;

  const gem = String(formData.get("guardian_email") ?? "").trim();
  const guardian_email = gem.length > 0 ? gem : null;

  const gph = String(formData.get("guardian_phone") ?? "").trim();
  const guardian_phone = gph.length > 0 ? gph : null;

  const grel = String(formData.get("guardian_relationship") ?? "").trim();
  const guardian_relationship = grel.length > 0 ? grel : null;

  return {
    attended_full_name,
    birth_date,
    sex,
    dietary_restrictions,
    chronic_medications,
    guardian_full_name,
    guardian_document_id,
    guardian_email,
    guardian_phone,
    guardian_relationship,
  };
}

function parseLifecycleStatus(
  raw: string,
): ClientLifecycleStatus | null {
  if (raw === "ativo" || raw === "inativo" || raw === "finalizado") {
    return raw;
  }
  return null;
}

function parseOptionalDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function parseWebsiteUrl(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "URL do site inválida." };
    }
    return { ok: true, value: u.toString() };
  } catch {
    return { ok: false, error: "URL do site inválida." };
  }
}

function parseSocialLinks(formData: FormData): ClientSocialLinks {
  const keys = [
    "instagram",
    "facebook",
    "linkedin",
    "whatsapp",
    "other",
  ] as const;
  const out: ClientSocialLinks = {};
  for (const k of keys) {
    const v = String(formData.get(`social_${k}`) ?? "").trim();
    if (v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

function parseOptionalCpf(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (!isValidCpf(digits)) return { ok: false, error: "CPF do responsável legal inválido." };
  return { ok: true, value: digits };
}

function parsePjFields(formData: FormData):
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; error: string } {
  const lifeRaw = String(formData.get("lifecycle_status") ?? "").trim();
  const lifecycle_status = parseLifecycleStatus(lifeRaw);
  if (!lifecycle_status) {
    return { ok: false, error: "Selecione o estado do contrato." };
  }

  const activated_at = parseOptionalDate(
    String(formData.get("activated_at") ?? ""),
  );

  const state_registration = String(
    formData.get("state_registration") ?? "",
  ).trim() || null;
  const municipal_registration = String(
    formData.get("municipal_registration") ?? "",
  ).trim() || null;
  const sanitary_license = String(
    formData.get("sanitary_license") ?? "",
  ).trim() || null;

  const webParsed = parseWebsiteUrl(String(formData.get("website_url") ?? ""));
  if (!webParsed.ok) return webParsed;
  const website_url = webParsed.value;

  const social_links = parseSocialLinks(formData);

  const legal_rep_full_name =
    String(formData.get("legal_rep_full_name") ?? "").trim() || null;
  const legalRepDocRaw = String(
    formData.get("legal_rep_document_id") ?? "",
  ).trim();
  const legalRepDoc = parseOptionalCpf(legalRepDocRaw);
  if (!legalRepDoc.ok) return legalRepDoc;
  const legal_rep_document_id = legalRepDoc.value;

  const legal_rep_role =
    String(formData.get("legal_rep_role") ?? "").trim() || null;
  const legal_rep_email =
    String(formData.get("legal_rep_email") ?? "").trim() || null;
  const legal_rep_phone =
    String(formData.get("legal_rep_phone") ?? "").trim() || null;

  const technical_rep_full_name =
    String(formData.get("technical_rep_full_name") ?? "").trim() || null;
  const technical_rep_professional_id =
    String(formData.get("technical_rep_professional_id") ?? "").trim() ||
    null;
  const technical_rep_email =
    String(formData.get("technical_rep_email") ?? "").trim() || null;
  const technical_rep_phone =
    String(formData.get("technical_rep_phone") ?? "").trim() || null;

  const segRaw = String(formData.get("business_segment") ?? "").trim();
  let business_segment: string | null = null;
  if (segRaw.length > 0) {
    if (segRaw.length > 80) {
      return { ok: false, error: "Categoria do negócio muito longa." };
    }
    business_segment = segRaw;
  }

  return {
    ok: true,
    fields: {
      lifecycle_status,
      business_segment,
      activated_at,
      state_registration,
      municipal_registration,
      sanitary_license,
      website_url,
      social_links,
      legal_rep_full_name,
      legal_rep_document_id,
      legal_rep_role,
      legal_rep_email,
      legal_rep_phone,
      technical_rep_full_name,
      technical_rep_professional_id,
      technical_rep_email,
      technical_rep_phone,
    },
  };
}

/** Lê os campos `est_*` do FormData e retorna payload pronto para inserir/atualizar. */
function parseEstablishmentInlineFields(
  formData: FormData,
  fallbackName: string,
) {
  const rawName = String(formData.get("est_name") ?? "").trim();
  const name = rawName.length > 0 ? rawName : fallbackName;

  // Deriva o tipo de estabelecimento automaticamente da categoria do negócio.
  const segmentRaw = String(formData.get("business_segment") ?? "").trim();
  const establishment_type = establishmentTypeFromSegment(segmentRaw);

  const address_line1 =
    String(formData.get("est_address_line1") ?? "").trim() || "";

  const addr2Raw = String(formData.get("est_address_line2") ?? "").trim();
  const address_line2 = addr2Raw.length > 0 ? addr2Raw : null;

  const cityRaw = String(formData.get("est_city") ?? "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const stateRaw = String(formData.get("est_state") ?? "")
    .trim()
    .toUpperCase();
  const state = stateRaw.length === 2 ? stateRaw : null;

  const postalRaw = String(formData.get("est_postal_code") ?? "").trim();
  const postal_code = postalRaw.length > 0 ? postalRaw : null;

  return {
    name,
    establishment_type,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
  };
}

export type ClientFormResult =
  | { ok: true }
  | { ok: false; error: string };

async function resolveResponsibleTeamMemberId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  formData: FormData,
): Promise<{ ok: true; value: string | null } | { ok: false; error: string }> {
  const raw = String(formData.get("responsible_team_member_id") ?? "").trim();
  if (!raw) return { ok: true, value: null };
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", raw)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();
  if (!data) {
    return { ok: false, error: "Profissional responsável inválido." };
  }
  return { ok: true, value: raw };
}

function parseKind(raw: unknown): ClientKind | null {
  if (raw === "pf" || raw === "pj") return raw;
  return null;
}

function sanitizeSearchWildcards(q: string): string {
  return q.replace(/[%_\\]/g, "").replace(/,/g, " ");
}

function escapeIlikeValue(s: string): string {
  return s.replace(/"/g, '""');
}

function parseDocument(
  kind: ClientKind,
  raw: string,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (kind === "pf") {
    if (!isValidCpf(digits)) return { ok: false, error: "CPF inválido." };
    return { ok: true, value: digits };
  }
  if (!isValidCnpj(digits)) return { ok: false, error: "CNPJ inválido." };
  return { ok: true, value: digits };
}

export async function createClientAction(
  _prev: ClientFormResult | undefined,
  formData: FormData,
): Promise<ClientFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const kind = parseKind(formData.get("kind"));
  if (!kind) {
    return { ok: false, error: "Selecione o tipo de cliente." };
  }

  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false, error: "Indique o nome ou a razão social." };
  }

  const trade_nameRaw = String(formData.get("trade_name") ?? "").trim();
  const trade_name =
    kind === "pj" && trade_nameRaw.length > 0 ? trade_nameRaw : null;

  const docRaw = String(formData.get("document_id") ?? "").trim();
  const parsedDoc = parseDocument(kind, docRaw);
  if (!parsedDoc.ok) {
    return { ok: false, error: parsedDoc.error };
  }
  const document_id = parsedDoc.value;

  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.length > 0 ? emailRaw : null;

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const pf = parsePfProfile(formData, kind);

  let pjPayload: Record<string, unknown> = {
    ...pfOnlyClearPayload(),
    logo_storage_path: null,
  };
  if (kind === "pj") {
    const pj = parsePjFields(formData);
    if (!pj.ok) return { ok: false, error: pj.error };
    pjPayload = { ...pj.fields, logo_storage_path: null };
  }

  const responsibleRes = await resolveResponsibleTeamMemberId(
    supabase,
    workspaceOwnerId,
    formData,
  );
  if (!responsibleRes.ok) {
    return { ok: false, error: responsibleRes.error };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_user_id: workspaceOwnerId,
      kind,
      legal_name,
      trade_name,
      document_id,
      email,
      phone,
      notes,
      responsible_team_member_id: responsibleRes.value,
      ...pf,
      ...pjPayload,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível criar o cliente." };
  }

  const newId = data.id as string;

  if (kind === "pj") {
    const logoRes = await resolveClientLogoPathFromForm({
      supabase,
      userId: workspaceOwnerId,
      clientId: newId,
      formData,
      previousPath: null,
    });
    if (!logoRes.ok) {
      await supabase
        .from("clients")
        .delete()
        .eq("id", newId)
        .eq("owner_user_id", workspaceOwnerId);
      return { ok: false, error: logoRes.error };
    }
    if (logoRes.path !== null) {
      await supabase
        .from("clients")
        .update({ logo_storage_path: logoRes.path })
        .eq("id", newId)
        .eq("owner_user_id", workspaceOwnerId);
    }
  }

  if (kind === "pj") {
    const estPayload = parseEstablishmentInlineFields(formData, legal_name);
    const { error: estErr } = await supabase.from("establishments").insert({
      client_id: newId,
      ...estPayload,
    });
    if (estErr) {
      // Estabelecimento não criado: cliente existe mas sem estabelecimento.
      // Redireciona para edição onde o utilizador pode corrigir.
      console.error("[createClientAction] establishment insert failed:", estErr.message);
    }
  }

  if (kind === "pf") {
    await appendClientExamUploads(supabase, workspaceOwnerId, newId, formData);
  }

  revalidatePathsAfterClientMutation(newId);
  redirect(`/clientes/${newId}/editar`);
}

function revalidatePathsAfterClientMutation(clientId: string) {
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}/editar`);
  revalidatePath("/visitas/nova");
  revalidatePath("/visitas");
  revalidatePath("/pacientes");
  revalidatePath("/inicio");
  revalidatePath("/estabelecimentos");
  revalidatePath("/checklists");
}

export async function updateClientAction(
  _prev: ClientFormResult | undefined,
  formData: FormData,
): Promise<ClientFormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Identificador em falta." };
  }

  const { data: existing, error: exErr } = await supabase
    .from("clients")
    .select("logo_storage_path, owner_user_id")
    .eq("id", id)
    .maybeSingle();

  if (exErr || !existing || existing.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Cliente não encontrado." };
  }

  const previousLogo =
    typeof existing.logo_storage_path === "string"
      ? existing.logo_storage_path
      : null;

  const kind = parseKind(formData.get("kind"));
  if (!kind) {
    return { ok: false, error: "Selecione o tipo de cliente." };
  }

  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false, error: "Indique o nome ou a razão social." };
  }

  const trade_nameRaw = String(formData.get("trade_name") ?? "").trim();
  const trade_name =
    kind === "pj" && trade_nameRaw.length > 0 ? trade_nameRaw : null;

  const docRaw = String(formData.get("document_id") ?? "").trim();
  const parsedDoc = parseDocument(kind, docRaw);
  if (!parsedDoc.ok) {
    return { ok: false, error: parsedDoc.error };
  }
  const document_id = parsedDoc.value;

  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.length > 0 ? emailRaw : null;

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const pf = parsePfProfile(formData, kind);

  let logoPath = previousLogo;
  if (kind === "pj") {
    const logoRes = await resolveClientLogoPathFromForm({
      supabase,
      userId: workspaceOwnerId,
      clientId: id,
      formData,
      previousPath: previousLogo,
    });
    if (!logoRes.ok) {
      return { ok: false, error: logoRes.error };
    }
    logoPath = logoRes.path;
  } else {
    await deleteLogoAtPathIfAny(supabase, previousLogo);
    logoPath = null;
  }

  const baseUpdate: Record<string, unknown> = {
    kind,
    legal_name,
    trade_name,
    document_id,
    email,
    phone,
    notes,
    ...pf,
  };

  if (kind === "pj") {
    const pj = parsePjFields(formData);
    if (!pj.ok) return { ok: false, error: pj.error };
    Object.assign(baseUpdate, pj.fields, { logo_storage_path: logoPath });
  } else {
    Object.assign(baseUpdate, pfOnlyClearPayload(), { logo_storage_path: logoPath });
  }

  const responsibleRes = await resolveResponsibleTeamMemberId(
    supabase,
    workspaceOwnerId,
    formData,
  );
  if (!responsibleRes.ok) {
    return { ok: false, error: responsibleRes.error };
  }
  Object.assign(baseUpdate, {
    responsible_team_member_id: responsibleRes.value,
  });

  const { error } = await supabase
    .from("clients")
    .update(baseUpdate)
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  if (kind === "pj") {
    const estPayload = parseEstablishmentInlineFields(formData, legal_name);
    const { data: existingEst } = await supabase
      .from("establishments")
      .select("id")
      .eq("client_id", id)
      .maybeSingle();

    if (existingEst) {
      const { error: estErr } = await supabase
        .from("establishments")
        .update(estPayload)
        .eq("id", existingEst.id);
      if (estErr) {
        console.error("[updateClientAction] establishment update failed:", estErr.message);
      }
    } else {
      const { error: estErr } = await supabase.from("establishments").insert({
        client_id: id,
        ...estPayload,
      });
      if (estErr) {
        console.error("[updateClientAction] establishment insert failed:", estErr.message);
      }
    }
  }

  if (kind === "pf") {
    await appendClientExamUploads(supabase, workspaceOwnerId, id, formData);
  }

  revalidatePathsAfterClientMutation(id);
  return { ok: true };
}

export async function deleteClientAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/clientes");

  const { data: row } = await supabase
    .from("clients")
    .select("logo_storage_path")
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId)
    .maybeSingle();

  const logoPath =
    row && typeof row.logo_storage_path === "string"
      ? row.logo_storage_path
      : null;
  await deleteLogoAtPathIfAny(supabase, logoPath);

  await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", workspaceOwnerId);

  revalidatePath("/clientes");
  revalidatePath("/pacientes");
  revalidatePath("/visitas/nova");
  revalidatePath("/visitas");
  revalidatePath("/inicio");
  redirect("/clientes");
}

/** Para a lista com filtros (RSC). */
export async function loadClientsForOwner(options: {
  q?: string;
  kind?: ClientKind | "all";
  lifecycle?: ClientLifecycleStatus | "all";
  businessSegments?: ClientBusinessSegment[];
}): Promise<{ rows: ClientRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  let q = supabase
    .from("clients")
    .select("*")
    .eq("owner_user_id", workspaceOwnerId)
    .order("created_at", { ascending: false });

  const kindFilter = options.kind;
  if (kindFilter === "pf" || kindFilter === "pj") {
    q = q.eq("kind", kindFilter);
  }

  const lifeFilter = options.lifecycle;
  if (
    lifeFilter === "ativo" ||
    lifeFilter === "inativo" ||
    lifeFilter === "finalizado"
  ) {
    q = q.eq("lifecycle_status", lifeFilter);
  }

  const businessSegmentsFilter = options.businessSegments;
  if (businessSegmentsFilter && businessSegmentsFilter.length > 0) {
    q = q.in("business_segment", businessSegmentsFilter);
  }

  const rawQ = (options.q ?? "").trim();
  if (rawQ.length > 0) {
    const safe = sanitizeSearchWildcards(rawQ);
    const pattern = escapeIlikeValue(`%${safe}%`);
    q = q.or(
      `legal_name.ilike."${pattern}",trade_name.ilike."${pattern}",document_id.ilike."${pattern}",email.ilike."${pattern}"`,
    );
  }

  const { data, error } = await q;
  if (error || !data) {
    return { rows: [] };
  }

  const rows = (data as Record<string, unknown>[]).map((r) =>
    normalizeClientRow(r),
  );
  return { rows };
}
