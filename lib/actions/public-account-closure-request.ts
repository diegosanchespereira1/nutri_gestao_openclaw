"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { initiateClosureForUser } from "@/lib/actions/account-deletion";
import { sendAccountDeletionRequestEmailSmtp } from "@/lib/email/send-account-deletion-email-smtp";
import {
  checkAccountClosureRequestRateLimit,
  getClientIpFromHeaders,
} from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PublicAccountClosureSubmitResponse } from "@/lib/types/account-closure-request";

const PUBLIC_SUCCESS_MESSAGE =
  "Se este email estiver cadastrado na NutriGestão, você receberá instruções para confirmar ou cancelar o pedido em até alguns minutos. Verifique também a pasta de spam.";

const submitSchema = z.object({
  email: z.string().trim().email("Informe um email válido"),
  notes: z.string().trim().max(2000).optional(),
  confirmed: z.literal(true, {
    errorMap: () => ({
      message: "É necessário confirmar que leu as regras de exclusão",
    }),
  }),
});

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip, "utf8").digest("hex");
}

async function updateClosureRequest(
  requestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const service = createServiceRoleClient();
  await service
    .from("account_closure_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", requestId);
}

export async function submitPublicAccountClosureRequest(input: {
  email: string;
  notes?: string;
  confirmed: boolean;
}): Promise<PublicAccountClosureSubmitResponse> {
  try {
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const email = parsed.data.email.toLowerCase().trim();
    const hdrs = await headers();
    const ip = getClientIpFromHeaders(
      hdrs.get("x-forwarded-for"),
      hdrs.get("x-real-ip"),
    );
    const userAgent = hdrs.get("user-agent");

    const rateLimit = await checkAccountClosureRequestRateLimit(email, ip);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Muitas tentativas. Aguarde e tente novamente mais tarde.",
      };
    }

    const service = createServiceRoleClient();

    const { data: requestRow, error: insertError } = await service
      .from("account_closure_requests")
      .insert({
        email,
        source: "public_web",
        status: "received",
        notes: parsed.data.notes || null,
        ip_hash: hashIp(ip),
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (insertError || !requestRow) {
      console.error("[submitPublicAccountClosureRequest] insert:", insertError);
      return { success: false, error: "Não foi possível registar o pedido." };
    }

    const requestId = requestRow.id as string;

    const { data: userId, error: lookupError } = await service.rpc(
      "lgpd_lookup_user_id_by_email",
      { p_email: email },
    );

    if (lookupError) {
      console.error("[submitPublicAccountClosureRequest] lookup:", lookupError);
      await updateClosureRequest(requestId, {
        status: "failed",
        failure_reason: lookupError.message,
        processed_at: new Date().toISOString(),
      });
      return { success: true, message: PUBLIC_SUCCESS_MESSAGE };
    }

    if (!userId) {
      await updateClosureRequest(requestId, {
        status: "not_found",
        processed_at: new Date().toISOString(),
      });
      return { success: true, message: PUBLIC_SUCCESS_MESSAGE };
    }

    const closure = await initiateClosureForUser(userId as string, "public_web");
    if (!closure.ok) {
      await updateClosureRequest(requestId, {
        user_id: userId,
        status: "failed",
        failure_reason: closure.error,
        processed_at: new Date().toISOString(),
      });
      return { success: true, message: PUBLIC_SUCCESS_MESSAGE };
    }

    const { data: profileRow } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", closure.profileId)
      .maybeSingle();

    const displayName =
      profileRow?.full_name || email.split("@")[0] || "Utilizador";

    const emailResult = await sendAccountDeletionRequestEmailSmtp({
      to: email,
      recipientName: displayName,
      token: closure.rawToken,
      expiresAt: closure.expiresAt,
      linkBase: "public_web",
    });

    await updateClosureRequest(requestId, {
      user_id: userId,
      profile_id: closure.profileId,
      status: emailResult.ok ? "email_sent" : "failed",
      failure_reason: emailResult.ok ? null : emailResult.error,
      processed_at: new Date().toISOString(),
    });

    if (!emailResult.ok) {
      console.warn(
        "[submitPublicAccountClosureRequest] email:",
        emailResult.error,
      );
    }

    return { success: true, message: PUBLIC_SUCCESS_MESSAGE };
  } catch (err) {
    console.error("[submitPublicAccountClosureRequest]", err);
    return { success: false, error: "Erro inesperado. Tente novamente." };
  }
}
