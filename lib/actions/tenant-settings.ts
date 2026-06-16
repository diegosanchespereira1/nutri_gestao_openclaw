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

  // ── Nome da empresa/clínica ──────────────────────────────────────────────
  let nameChanged = false;
  let nameMigrationPending = false;
  if (formData.has("tenant_name")) {
    const nextName = String(formData.get("tenant_name") ?? "").trim().slice(0, 120);
    const { data: prevNameRaw, error: readError } =
      await supabase.rpc("workspace_tenant_name");
    // Migração ainda não aplicada (função inexistente): não bloqueia o logo.
    const missingFn = (code?: string, msg?: string) =>
      code === "PGRST202" ||
      code === "42883" ||
      /could not find the function|does not exist/i.test(msg ?? "");

    if (readError && missingFn(readError.code, readError.message)) {
      nameMigrationPending = true;
    } else {
      const prevName = typeof prevNameRaw === "string" ? prevNameRaw.trim() : "";
      if (nextName !== prevName) {
        const { error: nameError } = await supabase.rpc("set_workspace_tenant_name", {
          p_name: nextName,
        });
        if (nameError && missingFn(nameError.code, nameError.message)) {
          nameMigrationPending = true;
        } else if (nameError) {
          console.error("[updateTenantLogoAction] tenant name update failed", {
            code: nameError.code,
            message: nameError.message,
          });
          return { ok: false, error: "Não foi possível salvar o nome da empresa." };
        } else {
          nameChanged = true;
        }
      }
    }
  }

  // ── Logotipo ─────────────────────────────────────────────────────────────
  const logoRes = await resolveTenantLogoPathFromForm({
    supabase,
    ownerUserId: workspaceOwnerId,
    formData,
    previousPath,
  });
  if (!logoRes.ok) {
    return { ok: false, error: logoRes.error };
  }

  const logoChanged = logoRes.path !== previousPath;
  if (logoChanged) {
    const { error: updateError } = await supabase.rpc(
      "set_workspace_tenant_logo_storage_path",
      { p_path: logoRes.path },
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
  }

  if (nameMigrationPending) {
    return {
      ok: false,
      error:
        "O nome da empresa ainda não pode ser salvo: aplique a migração pendente do banco (supabase migration up) e tente novamente.",
    };
  }

  if (!logoChanged && !nameChanged) {
    return { ok: true, message: "Nenhuma alteração." };
  }

  revalidatePath("/definicoes/empresa");
  revalidatePath("/definicoes");

  return {
    ok: true,
    message:
      logoChanged && logoRes.path === null
        ? "Dados da empresa atualizados (logotipo removido)."
        : "Dados da empresa atualizados com sucesso.",
  };
}
