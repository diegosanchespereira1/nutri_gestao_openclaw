import type { ProfileRole } from "@/lib/roles";
import {
  DEFAULT_ENABLED_MODULES,
  parseEnabledModules,
  type EnabledModules,
} from "@/lib/types/modules";

/** Payload em `ng_profile_ctx` — preenchido pelo middleware após validar a sessão. */
export type ProfileContextCookie = {
  userId: string;
  /** Titular do workspace (igual a userId quando não é membro de equipe). */
  workspaceOwnerId: string;
  role: ProfileRole | null;
  timeZone: string;
  fullName: string | null;
  lgpdBlocked: boolean;
  needsOnboarding: boolean;
  cachedAt: number;
  enabledModules: EnabledModules;
};

export function parseProfileContextCookie(
  raw: string | undefined,
): ProfileContextCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileContextCookie> & Record<string, unknown>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.timeZone !== "string" ||
      typeof parsed.lgpdBlocked !== "boolean" ||
      typeof parsed.needsOnboarding !== "boolean" ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }
    const workspaceOwnerId =
      typeof parsed.workspaceOwnerId === "string" && parsed.workspaceOwnerId.length > 0
        ? parsed.workspaceOwnerId
        : parsed.userId;
    return {
      userId: parsed.userId,
      workspaceOwnerId,
      role: typeof parsed.role === "string" ? (parsed.role as ProfileRole) : null,
      timeZone: parsed.timeZone,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : null,
      lgpdBlocked: parsed.lgpdBlocked,
      needsOnboarding: parsed.needsOnboarding,
      cachedAt: parsed.cachedAt,
      enabledModules: parseEnabledModules(parsed.enabledModules ?? null),
    };
  } catch {
    return null;
  }
}

/** Subconjunto usado pelo layout da área autenticada (sem campos de guard). */
export type ProfileShellContextCookie = Pick<
  ProfileContextCookie,
  "userId" | "role" | "timeZone" | "fullName" | "enabledModules"
>;

export function parseProfileShellContextCookie(
  raw: string | undefined,
): ProfileShellContextCookie | null {
  const ctx = parseProfileContextCookie(raw);
  if (!ctx) return null;
  return {
    userId: ctx.userId,
    role: ctx.role,
    timeZone: ctx.timeZone,
    fullName: ctx.fullName,
    enabledModules: ctx.enabledModules ?? DEFAULT_ENABLED_MODULES,
  };
}
