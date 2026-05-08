import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/inicio/:path*",
    "/onboarding/:path*",
    "/clientes/:path*",
    "/visitas/:path*",
    "/pacientes/:path*",
    "/checklists/:path*",
    "/importar/:path*",
    "/equipe/:path*",
    "/ficha-tecnica/:path*",
    "/pops/:path*",
    "/definicoes/:path*",
    "/perfil/:path*",
    "/configuracoes/:path*",
    "/notificacoes/:path*",
    "/auditoria/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/auth/:path*",
    "/conta-bloqueada",
  ],
};
