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

  if (pathname === "/inicio" && cached.needsOnboarding) return false;

  return true;
}
