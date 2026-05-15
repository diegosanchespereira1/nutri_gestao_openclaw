import { type NextRequest } from "next/server";
import { applyContentSecurityPolicy } from "@/lib/security/content-security-policy";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  applyContentSecurityPolicy(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
