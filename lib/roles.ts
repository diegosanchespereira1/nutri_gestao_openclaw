export const PROFILE_ROLES = ["user", "admin", "super_admin"] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];

export function isProfileRole(value: string | null | undefined): value is ProfileRole {
  return (
    value === "user" || value === "admin" || value === "super_admin"
  );
}

/** Acesso à área administrativa da app (rotas /admin). */
export function canAccessAdminArea(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

const ROLE_LABELS: Record<ProfileRole, string> = {
  user: "Utilizador",
  admin: "Administrador",
  super_admin: "Super administrador",
};

export function profileRoleLabel(role: string | null | undefined): string {
  if (isProfileRole(role)) return ROLE_LABELS[role];
  return "—";
}
