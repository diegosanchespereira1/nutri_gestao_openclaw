"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  fetchTenantLogoStoragePath,
  resolveTenantLogoPathFromForm,
} from "@/lib/tenant/logo-sync";
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
  const previousPath = await fetchTenantLogoStoragePath(supabase);

  const logoRes = await resolveTenantLogoPathFromForm({
    supabase,
    ownerUserId: workspaceOwnerId,
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

  const { error: updateError } = await supabase.rpc(
    "set_workspace_tenant_logo_storage_path",
    {
      p_path: logoRes.path,
    },
  );

  if (updateError) {
    console.error("[updateTenantLogoAction] workspace logo update failed", {
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
