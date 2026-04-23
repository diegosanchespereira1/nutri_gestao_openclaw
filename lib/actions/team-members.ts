"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTeamJobRole } from "@/lib/constants/team-roles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ProfessionalArea, TeamMemberRow } from "@/lib/types/team-members";

function parseProfessionalArea(raw: unknown): ProfessionalArea | null {
  if (raw === "nutrition" || raw === "other") return raw;
  return null;
}

function hasSpecialCharacter(value: string): boolean {
  return /[^A-Za-z0-9]/.test(value);
}

function mapCreateAuthErrorToParam(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  const isDuplicate =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("user already");
  if (isDuplicate) return "email_exists";

  const isWeakPassword =
    message.includes("password") &&
    (message.includes("short") ||
      message.includes("weak") ||
      message.includes("least") ||
      message.includes("minimum") ||
      message.includes("special") ||
      message.includes("complex"));
  if (isWeakPassword) return "password_policy";

  if (message.includes("email") && message.includes("invalid")) {
    return "email_invalid";
  }

  return "auth_create";
}

export type CreateTeamMemberResult =
  | { ok: true }
  | { ok: false; error: string; reason?: string };

function createTeamMemberError(
  err: string,
  fallbackReason?: string,
): CreateTeamMemberResult {
  if (err === "missing") {
    return {
      ok: false,
      error:
        "Preencha nome, e-mail, senha, confirmação, área profissional e perfil/cargo.",
    };
  }
  if (err === "password_mismatch") {
    return { ok: false, error: "As senhas não coincidem." };
  }
  if (err === "password_policy") {
    return {
      ok: false,
      error: "Senha fraca. Use no mínimo 6 caracteres e pelo menos 1 especial.",
      reason:
        fallbackReason ??
        "A senha precisa ter ao menos 6 caracteres e incluir símbolo (ex.: @ # !).",
    };
  }
  if (err === "crn") {
    return { ok: false, error: "Na área da nutrição, o CRN é obrigatório." };
  }
  if (err === "email_invalid") {
    return {
      ok: false,
      error: "Informe um e-mail válido para criar a conta do membro.",
      reason: fallbackReason ?? "Formato de e-mail inválido.",
    };
  }
  if (err === "email_exists") {
    return {
      ok: false,
      error: "Já existe uma conta com este e-mail.",
      reason:
        fallbackReason ??
        "Esse e-mail já está cadastrado no sistema. Use outro e-mail ou peça login ao membro.",
    };
  }
  if (err === "auth_create") {
    return {
      ok: false,
      error: "Não foi possível criar a conta de acesso do membro.",
      reason:
        fallbackReason ??
        "Falha na criação da conta de autenticação. Verifique as configurações e tente novamente.",
    };
  }
  return {
    ok: false,
    error: "Não foi possível salvar. Tente novamente.",
    reason: fallbackReason,
  };
}

function mapCreateAuthErrorReason(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  if (message.includes("already") || message.includes("registered")) {
    return "Esse e-mail já está cadastrado.";
  }
  if (message.includes("email") && message.includes("invalid")) {
    return "O e-mail informado é inválido.";
  }
  if (message.includes("password") && message.includes("special")) {
    return "A senha precisa conter pelo menos 1 caractere especial.";
  }
  if (message.includes("password") && message.includes("short")) {
    return "A senha informada é muito curta.";
  }
  return "Não foi possível validar os dados junto ao serviço de autenticação.";
}

type AuthUserLookup = {
  id: string;
  fullName: string | null;
};

async function findAuthUserByEmail(
  service: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<AuthUserLookup | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const pageSize = 200;
  const maxPages = 10;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      console.error("[findAuthUserByEmail] listUsers failed", {
        page,
        code: error.code,
        message: error.message,
        status: error.status,
      });
      return null;
    }

    const users = data?.users ?? [];
    const matched = users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (matched?.id) {
      const metadataName = matched.user_metadata?.full_name;
      const fullName =
        typeof metadataName === "string" && metadataName.trim().length > 0
          ? metadataName.trim()
          : null;
      return { id: matched.id, fullName };
    }

    if (users.length < pageSize) break;
  }

  return null;
}

export async function loadTeamMembersForOwner(): Promise<{
  rows: TeamMemberRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const ownerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("owner_user_id", ownerId)
    .order("full_name", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as TeamMemberRow[] };
}

export async function loadTeamMemberById(
  id: string,
): Promise<{ row: TeamMemberRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const ownerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (error || !data) return { row: null };
  return { row: data as TeamMemberRow };
}

export async function createTeamMemberAction(
  _prev: CreateTeamMemberResult | undefined,
  formData: FormData,
): Promise<CreateTeamMemberResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return createTeamMemberError("auth_create", "Sessão inválida.");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const area = parseProfessionalArea(formData.get("professional_area"));
  const jobRole = parseTeamJobRole(formData.get("job_role"));
  const crnRaw = String(formData.get("crn") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!fullName || !email || !area || !jobRole || !password || !confirmPassword) {
    return createTeamMemberError("missing");
  }

  const accountOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (accountOwnerId !== user.id) {
    return createTeamMemberError(
      "auth_create",
      "Apenas o titular da conta pode adicionar ou alterar membros da equipe.",
    );
  }

  if (password !== confirmPassword) {
    return createTeamMemberError("password_mismatch");
  }

  if (password.length < 6 || !hasSpecialCharacter(password)) {
    return createTeamMemberError("password_policy");
  }

  if (area === "nutrition" && !crnRaw) {
    return createTeamMemberError("crn");
  }

  const { data: existingTeamEmail, error: existingTeamEmailError } = await supabase
    .from("team_members")
    .select("id")
    .eq("owner_user_id", accountOwnerId)
    .ilike("email", email)
    .maybeSingle();

  if (existingTeamEmailError) {
    console.error("[createTeamMemberAction] existing team email check failed", {
      ownerUserId: user.id,
      email,
      code: existingTeamEmailError.code,
      message: existingTeamEmailError.message,
    });
    return createTeamMemberError("save");
  }

  if (existingTeamEmail?.id) {
    return createTeamMemberError(
      "email_exists",
      "Este e-mail já está vinculado a um membro da sua equipe.",
    );
  }

  const crn = crnRaw.length > 0 ? crnRaw : null;
  const notes = notesRaw.length > 0 ? notesRaw : null;
  let service: ReturnType<typeof createServiceRoleClient>;
  try {
    service = createServiceRoleClient();
  } catch (error) {
    console.error("[createTeamMemberAction] service role client failed", {
      ownerUserId: user.id,
      error,
    });
    const detail =
      error instanceof Error ? error.message : "Erro desconhecido ao iniciar cliente admin.";
    return createTeamMemberError(
      "auth_create",
      detail.includes("NEXT_PUBLIC_SUPABASE_URL")
        ? "URL do Supabase em falta no build da aplicação."
        : "A chave de serviço não chegou ao Node (veja logs do container: [service-role]). No Portainer use o nome exato SUPABASE_SERVICE_ROLE_KEY no ambiente do serviço e faça Recreate/redeploy do container.",
    );
  }

  let linkedMemberUserId: string | null = null;
  let linkedMemberResolvedName: string | null = null;
  let createdAuthUserId: string | null = null;

  const { data: createdUser, error: createAuthError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        source: "team_menu",
        invited_by_owner_user_id: user.id,
      },
    });

  if (createAuthError || !createdUser.user?.id) {
    const message = createAuthError?.message ?? "unknown auth create error";
    console.error("[createTeamMemberAction] auth user creation failed", {
      ownerUserId: user.id,
      email,
      code: createAuthError?.code,
      status: createAuthError?.status,
      message,
      hasUserId: Boolean(createdUser.user?.id),
    });
    const errParam = mapCreateAuthErrorToParam(message);

    if (errParam !== "email_exists") {
      return createTeamMemberError(errParam, mapCreateAuthErrorReason(message));
    }

    const existingAuthUser = await findAuthUserByEmail(service, email);
    if (!existingAuthUser) {
      return createTeamMemberError(
        "email_exists",
        "A conta já existe, mas não foi possível vinculá-la automaticamente. Tente novamente em instantes.",
      );
    }
    linkedMemberUserId = existingAuthUser.id;
    linkedMemberResolvedName = existingAuthUser.fullName;
  } else {
    linkedMemberUserId = createdUser.user.id;
    createdAuthUserId = createdUser.user.id;
    const metadataName = createdUser.user.user_metadata?.full_name;
    linkedMemberResolvedName =
      typeof metadataName === "string" && metadataName.trim().length > 0
        ? metadataName.trim()
        : null;
  }

  if (!linkedMemberUserId) {
    return createTeamMemberError(
      "auth_create",
      "Não foi possível identificar a conta autenticável do membro.",
    );
  }

  const persistedFullName =
    linkedMemberResolvedName && linkedMemberResolvedName.trim().length > 0
      ? linkedMemberResolvedName.trim()
      : fullName;

  const { data: existingLinkedMember, error: existingLinkedMemberError } =
    await supabase
      .from("team_members")
      .select("id")
      .eq("owner_user_id", accountOwnerId)
      .eq("member_user_id", linkedMemberUserId)
      .maybeSingle();

  if (existingLinkedMemberError) {
    console.error("[createTeamMemberAction] existing linked member check failed", {
      ownerUserId: user.id,
      memberUserId: linkedMemberUserId,
      code: existingLinkedMemberError.code,
      message: existingLinkedMemberError.message,
    });
    return createTeamMemberError("save");
  }

  if (existingLinkedMember?.id) {
    return createTeamMemberError(
      "email_exists",
      "Essa conta já está vinculada a um membro da sua equipe.",
    );
  }

  const { error } = await supabase.from("team_members").insert({
    owner_user_id: accountOwnerId,
    member_user_id: linkedMemberUserId,
    full_name: persistedFullName,
    email,
    phone: phone.length > 0 ? phone : null,
    professional_area: area,
    job_role: jobRole,
    crn: area === "nutrition" ? crn : null,
    notes,
  });

  if (error) {
    console.error("[createTeamMemberAction] team member insert failed", {
      ownerUserId: user.id,
      memberUserId: linkedMemberUserId,
      email,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    if (createdAuthUserId) {
      await service.auth.admin.deleteUser(createdAuthUserId);
    }
    return createTeamMemberError(
      "save",
      "A conta foi criada, mas houve falha ao vincular o membro na equipe.",
    );
  }

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}

export async function updateTeamMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (accountOwnerId !== user.id) {
    redirect("/equipe?err=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/equipe?err=missing");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const area = parseProfessionalArea(formData.get("professional_area"));
  const jobRole = parseTeamJobRole(formData.get("job_role"));
  const crnRaw = String(formData.get("crn") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!fullName || !area || !jobRole) {
    redirect(`/equipe/${id}/editar?err=missing`);
  }

  if (area === "nutrition" && !crnRaw) {
    redirect(`/equipe/${id}/editar?err=crn`);
  }

  const crn = crnRaw.length > 0 ? crnRaw : null;
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const { error } = await supabase
    .from("team_members")
    .update({
      full_name: fullName,
      email: email.length > 0 ? email : null,
      phone: phone.length > 0 ? phone : null,
      professional_area: area,
      job_role: jobRole,
      crn: area === "nutrition" ? crn : null,
      notes,
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect(`/equipe/${id}/editar?err=save`);
  }

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}

export type TeamMemberSelectOption = {
  id: string;
  full_name: string;
};

/** Opções para selects «profissional responsável» (ordenado por nome). */
export async function loadTeamMembersForSelect(): Promise<
  TeamMemberSelectOption[]
> {
  const { rows } = await loadTeamMembersForOwner();
  return rows.map((r) => ({ id: r.id, full_name: r.full_name }));
}

export type ResponsiblePortfolioEntry = {
  clients: { id: string; legal_name: string }[];
  patients: { id: string; full_name: string }[];
};

/** Clientes e pacientes com `responsible_team_member_id` agrupados por membro. */
export async function loadResponsiblePortfolioByMemberId(): Promise<
  Record<string, ResponsiblePortfolioEntry>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const ownerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const [clientsRes, patientsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, legal_name, responsible_team_member_id")
      .eq("owner_user_id", ownerId)
      .not("responsible_team_member_id", "is", null),
    supabase
      .from("patients")
      .select("id, full_name, responsible_team_member_id")
      .eq("user_id", ownerId)
      .not("responsible_team_member_id", "is", null),
  ]);

  const byMember: Record<string, ResponsiblePortfolioEntry> = {};

  for (const row of clientsRes.data ?? []) {
    const mid = row.responsible_team_member_id as string;
    if (!byMember[mid]) {
      byMember[mid] = { clients: [], patients: [] };
    }
    byMember[mid].clients.push({
      id: row.id as string,
      legal_name: row.legal_name as string,
    });
  }

  for (const row of patientsRes.data ?? []) {
    const mid = row.responsible_team_member_id as string;
    if (!byMember[mid]) {
      byMember[mid] = { clients: [], patients: [] };
    }
    byMember[mid].patients.push({
      id: row.id as string,
      full_name: row.full_name as string,
    });
  }

  return byMember;
}

export async function deleteTeamMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (accountOwnerId !== user.id) {
    redirect("/equipe?err=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/equipe");

  await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}
