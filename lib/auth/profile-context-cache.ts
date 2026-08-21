import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { isAdminPath } from "@/lib/auth-paths";
import type { ProfileContextCookie } from "@/lib/auth/profile-context-cookie";

export function shouldReuseProfileContextCache(input: {
  isNewAppSession: boolean;
  cached: ProfileContextCookie | null;
  userId: string;
  nowSec: number;
  ttlSec: number;
  pathname: string;
  bemvindoParam: string | null;
}): boolean {
  const {
    isNewAppSession,
    cached,
    userId,
    nowSec,
    ttlSec,
    pathname,
    bemvindoParam,
  } = input;

  if (isNewAppSession) return false;
  if (!cached || cached.userId !== userId) return false;
  if (nowSec - cached.cachedAt > ttlSec) return false;

  if (bemvindoParam === "1") return false;

  // Papel admin/super_admin pode ter sido promovido após o cookie; /admin
  // precisa ler o perfil fresco para não barrar quem já tem permissão.
  if (isAdminPath(pathname)) return false;

  if (pathname === APP_DASHBOARD_PATH && cached.needsOnboarding) return false;

  return true;
}
