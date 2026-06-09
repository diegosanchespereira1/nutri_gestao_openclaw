"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { clearAppSessionCookies } from "@/lib/auth/clear-app-session-cookies";
import { getServerAppOrigin } from "@/lib/app-origin";
import { resolveProfilePhotoPathFromForm } from "@/lib/profile/photo-sync";
import { createClient } from "@/lib/supabase/server";
import { normalizeBrazilPhone } from "@/lib/validators/br-phone";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  clearAppSessionCookies(cookieStore);
}

export type UpdateProfileResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function updateProfileAction(
  _prev: UpdateProfileResult | undefined,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const crn = String(formData.get("crn") ?? "").trim();
  const phoneParsed = normalizeBrazilPhone(String(formData.get("phone") ?? ""));
  if (!phoneParsed.ok) {
    return { ok: false, error: phoneParsed.error };
  }
  const phone = phoneParsed.value;

  if (!full_name) {
    return { ok: false, error: "Indique o nome completo." };
  }
  if (!email) {
    return { ok: false, error: "Indique o email." };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "Indique um email válido." };
  }
  // CRN é opcional: membros de equipa de áreas não-nutrição podem não ter CRN.
  // O campo fica em branco e é guardado como string vazia — sem bloquear o perfil.

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("photo_storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const photoRes = await resolveProfilePhotoPathFromForm({
    supabase,
    userId: user.id,
    formData,
    previousPath: currentProfile?.photo_storage_path ?? null,
  });
  if (!photoRes.ok) {
    return { ok: false, error: photoRes.error };
  }

  const profileFields = {
    full_name,
    crn,
    phone,
    photo_storage_path: photoRes.path,
    updated_at: new Date().toISOString(),
  };

  /** Não usar upsert com user_id no payload: após migrações, UPDATE só cobre colunas
   * concedidas (full_name, crn, …) — incluir user_id no ON CONFLICT DO UPDATE falha com
   * "permission denied for column user_id". */
  const { data: afterUpdate, error: updateError } = await supabase
    .from("profiles")
    .update(profileFields)
    .eq("user_id", user.id)
    .select("id, crn")
    .maybeSingle();

  if (updateError) {
    console.error("[updateProfileAction] profiles update failed", {
      userId: user.id,
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
    });
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  let persistedProfile = afterUpdate;
  let profileSaved = Boolean(afterUpdate?.id);

  // Em alguns cenários (concessões UPDATE por coluna + versão do PostgREST/Supabase),
  // RETURNING pode devolver null mesmo quando o UPDATE foi bem-sucedido.
  // Verifica o estado real antes de tentar INSERT — evita violação de unicidade (23505)
  // para membros da equipe que já possuem linha em profiles.
  if (!persistedProfile) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, crn")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile?.id) {
      // Linha existe — UPDATE funcionou silenciosamente (RETURNING estava vazio).
      persistedProfile = existingProfile;
      profileSaved = true;
    }
  }

  if (!persistedProfile) {
    // Linha genuinamente inexistente: cria agora (raro — trigger handle_new_user
    // normalmente cria a linha no signup).
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        ...profileFields,
      })
      .select("id, crn")
      .maybeSingle();

    if (insertError) {
      console.error("[updateProfileAction] profiles insert failed", {
        userId: user.id,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return { ok: false, error: "Não foi possível salvar. Tente novamente." };
    }
    persistedProfile = inserted;
    profileSaved = Boolean(inserted?.id);
  }

  const persistedCrn = String(persistedProfile?.crn ?? "").trim();
  // Mantém o cadastro de equipe sincronizado quando o utilizador logado
  // também existe em `team_members` (membro convidado).
  const { data: syncedTeamMemberRaw, error: teamMemberSyncError } = await supabase
    .from("team_members")
    .update({
      full_name,
      phone,
      crn,
    })
    .eq("member_user_id", user.id)
    .select("id, crn")
    .maybeSingle();
  if (teamMemberSyncError) {
    console.error("[updateProfileAction] team_members sync failed", {
      userId: user.id,
      code: teamMemberSyncError.code,
      message: teamMemberSyncError.message,
      details: teamMemberSyncError.details,
      hint: teamMemberSyncError.hint,
    });
  }

  // Mesmo fallback de verificação para team_members: RETURNING pode ser null
  // mesmo com UPDATE bem-sucedido devido ao mesmo comportamento do PostgREST.
  let syncedTeamMember = syncedTeamMemberRaw;
  if (!syncedTeamMember && !teamMemberSyncError) {
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id, crn")
      .eq("member_user_id", user.id)
      .maybeSingle();
    if (existingMember?.id) {
      syncedTeamMember = existingMember;
    }
  }

  const teamMemberCrn = String(syncedTeamMember?.crn ?? "").trim();
  const crnSavedOnProfile = profileSaved && persistedCrn === crn.trim();
  const crnSavedOnTeamMember = Boolean(syncedTeamMember?.id) && teamMemberCrn === crn.trim();
  if (!crnSavedOnProfile && !crnSavedOnTeamMember) {
    return {
      ok: false,
      error: "Não foi possível atualizar o CRN. Tente novamente.",
    };
  }

  const currentEmail = (user.email ?? "").trim().toLowerCase();
  if (email !== currentEmail) {
    const origin = getServerAppOrigin();
    const { error: emailError } = await supabase.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/perfil")}`,
      },
    );
    if (emailError) {
      return {
        ok: false,
        error:
          "Perfil guardado, mas não foi possível iniciar a alteração de email. Tente novamente.",
      };
    }
    revalidatePath("/perfil");
    return {
      ok: true,
      message:
        "Perfil atualizado. Enviámos um link para confirmar o novo email.",
    };
  }

  revalidatePath("/perfil");
  return { ok: true };
}
