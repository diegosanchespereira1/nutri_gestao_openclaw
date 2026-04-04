"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * O Supabase Auth por vezes redireciona para a Site URL com erros no fragment
 * (#error=...), por exemplo se o link expirou ou se o redirect não foi aceite.
 * Envia o utilizador para /login com query params e remove o hash da barra de endereços.
 */
export function SupabaseHashAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash?.slice(1) ?? "";
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (!params.get("error")) return;

    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("error", "auth");
    const desc = params.get("error_description");
    const code = params.get("error_code");
    if (desc) loginUrl.searchParams.set("error_description", desc);
    if (code) loginUrl.searchParams.set("error_code", code);

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    router.replace(`${loginUrl.pathname}${loginUrl.search}`);
  }, [router]);

  return null;
}
