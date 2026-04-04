"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type UpdateProfileResult =
  | { ok: true }
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
  const crn = String(formData.get("crn") ?? "").trim();

  if (!full_name) {
    return { ok: false, error: "Indique o nome completo." };
  }
  if (!crn) {
    return { ok: false, error: "Indique o número do CRN." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name,
      crn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: "Não foi possível guardar. Tente novamente." };
  }

  revalidatePath("/perfil");
  return { ok: true };
}
