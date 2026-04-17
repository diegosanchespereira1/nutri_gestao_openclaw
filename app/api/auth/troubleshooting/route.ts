import { checkAuthRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextRequest, NextResponse } from "next/server";

type TroubleshootingPayload = {
  event?: unknown;
  step?: unknown;
  outcome?: unknown;
  email?: unknown;
  userId?: unknown;
  errorCode?: unknown;
  errorMessage?: unknown;
  nextPath?: unknown;
  hasSession?: unknown;
  metadata?: unknown;
  requestId?: unknown;
};

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const raw = (forwarded ? forwarded.split(",")[0]?.trim() : null) ?? realIp;
  if (!raw || raw === "unknown") return null;

  // Remove porta em IPv4 (ex.: 201.43.104.66:443)
  const withoutPortV4 = raw.replace(/:\d+$/, "");
  // Remove colchetes e porta em IPv6 (ex.: [2001:db8::1]:443)
  const withoutBrackets = withoutPortV4.replace(/^\[|\]$/g, "");
  const withoutPortV6 = withoutBrackets.replace(/\]:\d+$/, "");

  const candidate = withoutPortV6.trim();
  if (!candidate) return null;

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6LikeRegex = /^[0-9a-fA-F:]+$/;
  if (!ipv4Regex.test(candidate) && !ipv6LikeRegex.test(candidate)) return null;
  return candidate;
}

function asCleanString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[0-9a-fA-F-]{36}$/.test(trimmed) ? trimmed : null;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const forbidden = new Set([
    "password",
    "senha",
    "token",
    "access_token",
    "refresh_token",
  ]);

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (forbidden.has(key.toLowerCase())) continue;
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean" ||
      raw === null
    ) {
      output[key] = raw;
      continue;
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      output[key] = "[object]";
      continue;
    }
    if (Array.isArray(raw)) {
      output[key] = `[array:${raw.length}]`;
    }
  }

  const serialized = JSON.stringify(output);
  if (serialized.length > 3000) return { truncated: true };
  return output;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkAuthRateLimit(request);
  if (!rateLimitResult.success) {
    // Endpoint de telemetria: nunca bloquear o fluxo de auth do utilizador.
    return NextResponse.json({ ok: false, dropped: "rate_limited" }, { status: 202 });
  }

  let payload: TroubleshootingPayload;
  try {
    payload = (await request.json()) as TroubleshootingPayload;
  } catch {
    return NextResponse.json({ ok: false, dropped: "invalid_payload" }, { status: 202 });
  }

  const event = asCleanString(payload.event, 120);
  if (!event) {
    return NextResponse.json({ ok: false, dropped: "event_required" }, { status: 202 });
  }

  const email = asCleanString(payload.email, 320)?.toLowerCase() ?? null;
  const userId = parseRequestId(payload.userId);
  const requestId = parseRequestId(payload.requestId);
  const step = asCleanString(payload.step, 40);
  const outcome = asCleanString(payload.outcome, 40);
  const errorCode = asCleanString(payload.errorCode, 80);
  const errorMessage = asCleanString(payload.errorMessage, 500);
  const nextPath = asCleanString(payload.nextPath, 300);
  const hasSession =
    typeof payload.hasSession === "boolean" ? payload.hasSession : null;
  const metadata = sanitizeMetadata(payload.metadata);
  const userAgent = asCleanString(request.headers.get("user-agent"), 1000);
  const ipAddress = getClientIp(request);

  try {
    const service = createServiceRoleClient();
    const { error } = await service.from("auth_troubleshooting_logs").insert({
      request_id: requestId,
      event,
      step,
      outcome,
      email,
      user_id: userId,
      error_code: errorCode,
      error_message: errorMessage,
      next_path: nextPath,
      has_session: hasSession,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[auth-troubleshooting-log] insert failed", {
        event,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ ok: false, dropped: "insert_failed" }, { status: 202 });
    }
  } catch (error) {
    console.error("[auth-troubleshooting-log] exception", { event, error });
    return NextResponse.json({ ok: false, dropped: "server_error" }, { status: 202 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
