"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getServerAppOrigin } from "@/lib/app-origin";
import { resolveProfilePhotoPathFromForm } from "@/lib/profile/photo-sync";
import { createClient } from "@/lib/supabase/server";
import { normalizeBrazilPhone } from "@/lib/validators/br-phone";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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
  if (!crn) {
    return { ok: false, error: "Indique o número do CRN." };
  }

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

  let persistedProfile = afterUpdate;

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

  if (!persistedProfile) {
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
  }

  const persistedCrn = String(persistedProfile?.crn ?? "").trim();
  if (!persistedProfile?.id || persistedCrn !== crn.trim()) {
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
