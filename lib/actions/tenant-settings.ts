"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveTenantLogoPathFromForm } from "@/lib/tenant/logo-sync";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export type UpdateTenantLogoResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function updateTenantLogoAction(
  _prev: UpdateTenantLogoResult | undefined,
  formData: FormData,
): Promise<UpdateTenantLogoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  if (workspaceOwnerId !== user.id) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta pode gerenciar o logotipo da empresa. Peça ao administrador do workspace.",
    };
  }

  const { data: currentProfile, error: loadError } = await supabase
    .from("profiles")
    .select("tenant_logo_storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) {
    console.error("[updateTenantLogoAction] profile load failed", {
      userId: user.id,
      code: loadError.code,
      message: loadError.message,
    });
    return { ok: false, error: "Não foi possível carregar o perfil." };
  }

  const previousPath = currentProfile?.tenant_logo_storage_path ?? null;

  const logoRes = await resolveTenantLogoPathFromForm({
    supabase,
    ownerUserId: user.id,
    formData,
    previousPath,
  });
  if (!logoRes.ok) {
    return { ok: false, error: logoRes.error };
  }

  if (logoRes.path === previousPath) {
    return {
      ok: true,
      message: "Nenhuma alteração no logótipo.",
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      tenant_logo_storage_path: logoRes.path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[updateTenantLogoAction] profiles update failed", {
      userId: user.id,
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
    });
    return {
      ok: false,
      error: "Não foi possível salvar o logotipo. Tente novamente.",
    };
  }

  revalidatePath("/definicoes/empresa");
  revalidatePath("/definicoes");

  return {
    ok: true,
    message:
      logoRes.path === null
        ? "Logotipo removido com sucesso."
        : "Logotipo atualizado com sucesso.",
  };
}
