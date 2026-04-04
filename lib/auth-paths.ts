/** Rotas que não exigem sessão (prefix match para /auth/*). */
export const AUTH_PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth",
] as const;

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Área logada (Épico 1) — requer utilizador autenticado. */
export const PROTECTED_PREFIXES = [
  "/inicio",
  "/clientes",
  "/visitas",
  "/pacientes",
  "/checklists",
  "/importar",
  "/equipe",
  "/ficha-tecnica",
  "/pops",
  "/definicoes",
  "/perfil",
  "/admin",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Área admin — requer papel admin ou super_admin (além de sessão). */
export const ADMIN_PREFIXES = ["/admin"] as const;

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
