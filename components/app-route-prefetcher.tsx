"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { APP_DASHBOARD_PATH } from "@/lib/routes";

const PRIMARY_ROUTES = [
  APP_DASHBOARD_PATH,
  "/clientes",
  "/checklists",
  "/visitas",
  "/pacientes",
  "/financeiro",
  "/equipe",
] as const;

/**
 * Pré-carrega rotas principais após login para navegação quase instantânea.
 */
export function AppRoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    for (const route of PRIMARY_ROUTES) {
      router.prefetch(route);
    }
  }, [router]);

  return null;
}
