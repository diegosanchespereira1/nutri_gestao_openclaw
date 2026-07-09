"use server";

/**
 * Server Actions — encerramento de acesso LGPD (Story 11.7).
 * Estado em `profiles` + RPCs; ban opcional via service role.
 */

import { revalidatePath } from "next/cache";

import {
  closureTokenExpiresAt,
  createClosureToken,
  hashClosureToken,
} from "@/lib/account-closure/tokens";
import {
  isLgpdClosurePending,
  isProfileLgpdActivelyBlocked,
} from "@/lib/lgpd-block";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import {
  AccountClosureState,
  CancelClosureResponse,
  ClosureStatusResponse,
  ConfirmClosureResponse,
  DeleteAccountResponse,
} from "@/lib/types/account-deletion";
import {
  sendAccountDeletionRequestEmailSmtp,
  type AccountDeletionEmailLinkBase,
} from "@/lib/email/send-account-deletion-email-smtp";

async function tryBanUser(userId: string): Promise<void> {
  try {
    const service = createServiceRoleClient();
    await service.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
  } catch (e) {
    console.warn(
      "[account-deletion] ban via service role ignorado:",
      e instanceof Error ? e.message : e,
    );
  }
}

async function tryUnbanUser(userId: string): Promise<void> {
  try {
    const service = createServiceRoleClient();
    await service.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
  } catch (e) {
    console.warn(
      "[account-deletion] unban via service role ignorado:",
      e instanceof Error ? e.message : e,
    );
  }
}

async function syncClosureRequestStatus(
  userId: string,
  status: "confirmed" | "cancelled",
): Promise<void> {
  try {
    const service = createServiceRoleClient();
    await service.rpc("account_closure_request_sync_by_user", {
      p_user_id: userId,
      p_status: status,
      p_confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      p_cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.warn(
      "[account-deletion] sync closure request ignorado:",
      e instanceof Error ? e.message : e,
    );
  }
}

function rowToState(row: {
  lgpd_blocked_at: string | null;
  lgpd_unblocked_at: string | null;
  lgpd_blocked_until: string | null;
  lgpd_cancel_token_expires_at: string | null;
  lgpd_cancel_token_hash: string | null;
}): AccountClosureState {
  const blocked = isProfileLgpdActivelyBlocked({
    lgpd_blocked_at: row.lgpd_blocked_at,
    lgpd_unblocked_at: row.lgpd_unblocked_at,
    lgpd_cancel_token_hash: row.lgpd_cancel_token_hash,
    lgpd_cancel_token_expires_at: row.lgpd_cancel_token_expires_at,
  });
  const pending = isLgpdClosurePending({
    lgpd_blocked_at: row.lgpd_blocked_at,
    lgpd_unblocked_at: row.lgpd_unblocked_at,
    lgpd_cancel_token_hash: row.lgpd_cancel_token_hash,
    lgpd_cancel_token_expires_at: row.lgpd_cancel_token_expires_at,
  });

  let hoursUntilExpiry: number | undefined;
  if (
    pending &&
    row.lgpd_cancel_token_expires_at &&
    !blocked
  ) {
    const expiresAt = new Date(row.lgpd_cancel_token_expires_at);
    const diffMs = expiresAt.getTime() - Date.now();
    hoursUntilExpiry = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  }

  let status: AccountClosureState["status"] = "none";
  if (blocked) status = "blocked";
  else if (pending) status = "pending";

  return {
    status,
    lgpd_blocked_at: row.lgpd_blocked_at,
    lgpd_blocked_until: row.lgpd_blocked_until,
    lgpd_cancel_token_expires_at: row.lgpd_cancel_token_expires_at,
    hours_until_expiry: hoursUntilExpiry,
  };
}

export async function getDeletionStatus(): Promise<ClosureStatusResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Não autenticado" };
    }

    const { data: row, error } = await supabase
      .from("profiles")
      .select(
        "lgpd_blocked_at, lgpd_unblocked_at, lgpd_blocked_until, lgpd_cancel_token_expires_at, lgpd_cancel_token_hash",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return { success: false, error: "Perfil não encontrado" };
    }

    return {
      success: true,
      status: rowToState(row),
    };
  } catch (err) {
    console.error("Erro em getDeletionStatus:", err);
    return { success: false, error: "Erro inesperado" };
  }
}

export async function requestAccountDeletion(
  password: string,
): Promise<DeleteAccountResponse> {
  try {
    if (!password || password.length < 1) {
      return { success: false, error: "Senha é obrigatória" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Não autenticado" };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return { success: false, error: "Senha incorreta" };
    }

    const rawToken = createClosureToken();
    const tokenHash = hashClosureToken(rawToken);
    const expiresAt = closureTokenExpiresAt();

    const { error: rpcError } = await supabase.rpc("lgpd_set_pending_closure", {
      p_token_hash: tokenHash,
      p_expires_at: expiresAt.toISOString(),
    });

    if (rpcError) {
      console.error("lgpd_set_pending_closure:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Falha ao registar pedido",
      };
    }

    const displayName =
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name) ||
      user.email?.split("@")[0] ||
      "Utilizador";

    const emailResult = await sendAccountDeletionRequestEmailSmtp({
      to: user.email!,
      recipientName: displayName,
      token: rawToken,
      expiresAt,
      linkBase: "in_app",
    });

    if (!emailResult.ok) {
      console.warn(
        "[requestAccountDeletion] Email não enviado:",
        emailResult.error,
      );
    }

    revalidatePath("/configuracoes/deletar-conta");

    return {
      success: true,
      message: emailResult.ok
        ? "Pedido registado. Verifique o email para confirmar ou cancelar dentro de 24 horas."
        : "Pedido registado. Não foi possível enviar o email automaticamente; contacte o suporte se necessário.",
      email: user.email,
      expires_at: expiresAt.toISOString(),
    };
  } catch (err) {
    console.error("Erro em requestAccountDeletion:", err);
    return { success: false, error: "Erro inesperado" };
  }
}

/** Confirma encerramento via link do email (com ou sem sessão). */
export async function confirmAccountDeletionByToken(
  token: string,
): Promise<ConfirmClosureResponse> {
  try {
    if (!token || token.length < 32) {
      return { success: false, error: "Token inválido" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: rpcError } = await supabase.rpc("lgpd_confirm_closure", {
        p_token: token,
      });

      if (rpcError) {
        return {
          success: false,
          error: rpcError.message || "Não foi possível confirmar",
        };
      }

      await tryBanUser(user.id);
      await syncClosureRequestStatus(user.id, "confirmed");
    } else {
      const anon = createAnonSupabaseClient();
      const { data: blockedUserId, error: rpcError } = await anon.rpc(
        "lgpd_confirm_closure_by_token",
        { p_token: token },
      );

      if (rpcError || !blockedUserId) {
        return {
          success: false,
          error: "Token inválido ou expirado",
        };
      }

      await tryBanUser(blockedUserId);
      await syncClosureRequestStatus(blockedUserId, "confirmed");
    }

    revalidatePath("/configuracoes/deletar-conta");
    revalidatePath("/excluir-conta");

    return {
      success: true,
      message:
        "Acesso à conta encerrado. Os dados clínicos permanecem retidos conforme obrigação legal.",
      status: "blocked",
    };
  } catch (err) {
    console.error("Erro em confirmAccountDeletionByToken:", err);
    return { success: false, error: "Erro inesperado" };
  }
}

export async function confirmAccountDeletion(
  token: string,
): Promise<ConfirmClosureResponse> {
  return confirmAccountDeletionByToken(token);
}

export async function cancelAccountDeletion(
  token: string,
): Promise<CancelClosureResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: rpcError } = await supabase.rpc(
        "lgpd_cancel_pending_closure",
      );
      if (rpcError) {
        return {
          success: false,
          error: rpcError.message || "Não foi possível cancelar",
        };
      }
      await syncClosureRequestStatus(user.id, "cancelled");
    } else {
      if (!token || token.length < 32) {
        return { success: false, error: "Token inválido" };
      }

      const service = createServiceRoleClient();
      const tokenHash = hashClosureToken(token);
      const { data: profileBeforeCancel } = await service
        .from("profiles")
        .select("user_id")
        .eq("lgpd_cancel_token_hash", tokenHash)
        .maybeSingle();

      const anon = createAnonSupabaseClient();
      const { data, error: rpcError } = await anon.rpc(
        "lgpd_cancel_pending_by_token",
        { p_token: token },
      );
      if (rpcError || !data) {
        return {
          success: false,
          error: "Token inválido ou pedido já não pode ser cancelado",
        };
      }

      if (profileBeforeCancel?.user_id) {
        await syncClosureRequestStatus(profileBeforeCancel.user_id, "cancelled");
      }
    }

    revalidatePath("/configuracoes/deletar-conta");
    revalidatePath("/excluir-conta");

    return {
      success: true,
      message: "Pedido cancelado. A sua conta continua ativa.",
      status: "none",
    };
  } catch (err) {
    console.error("Erro em cancelAccountDeletion:", err);
    return { success: false, error: "Erro inesperado" };
  }
}

/** Chamado após desbloqueio administrativo (admin-platform). */
export async function liftAuthBanAfterLgpdUnblock(userId: string): Promise<void> {
  await tryUnbanUser(userId);
}

export type InitiateClosureForUserResult =
  | {
      ok: true;
      rawToken: string;
      expiresAt: Date;
      profileId: string;
    }
  | { ok: false; error: string };

/** Inicia pedido de encerramento para um user_id (service role / formulário público). */
export async function initiateClosureForUser(
  userId: string,
  source: AccountDeletionEmailLinkBase,
): Promise<InitiateClosureForUserResult> {
  const rawToken = createClosureToken();
  const tokenHash = hashClosureToken(rawToken);
  const expiresAt = closureTokenExpiresAt();

  try {
    const service = createServiceRoleClient();
    const { data: profileId, error } = await service.rpc(
      "lgpd_set_pending_closure_for_user",
      {
        p_user_id: userId,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt.toISOString(),
        p_source: source === "public_web" ? "public_web" : "in_app",
      },
    );

    if (error || !profileId) {
      return {
        ok: false,
        error: error?.message || "Falha ao registar pedido",
      };
    }

    return {
      ok: true,
      rawToken,
      expiresAt,
      profileId: profileId as string,
    };
  } catch (err) {
    console.error("initiateClosureForUser:", err);
    return { ok: false, error: "Erro inesperado" };
  }
}
