import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { bumpAppSessionActivityCookies } from "@/lib/auth/bump-app-session-activity";
import { APP_SESSION_START_COOKIE } from "@/lib/auth/app-session-cookies";
import { isNativeClientRequest } from "@/lib/auth/native-client-cookie";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Mantém `ng_sess_last` actualizado durante trabalho prolongado (ex.: preenchimento de checklist). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const cookieStore = await cookies();
  const startRaw = cookieStore.get(APP_SESSION_START_COOKIE)?.value;
  const startParsed = startRaw ? Number.parseInt(startRaw, 10) : NaN;

  const res = new NextResponse(null, { status: 204 });
  bumpAppSessionActivityCookies(res.cookies, {
    nativeClient: isNativeClientRequest(request),
    sessionStartSec: Number.isFinite(startParsed) ? startParsed : null,
  });
  return res;
}
