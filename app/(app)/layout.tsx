import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AppTimeZoneProvider } from "@/components/app-timezone-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { canAccessAdminArea, type ProfileRole } from "@/lib/roles";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import {
  DEFAULT_ENABLED_MODULES,
  parseEnabledModules,
  type EnabledModules,
} from "@/lib/types/modules";

type ProfileCtxCookie = {
  userId: string;
  role: ProfileRole | null;
  timeZone: string;
  fullName: string | null;
  enabledModules: EnabledModules;
};

function parseProfileCtxCookie(raw: string | undefined): ProfileCtxCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileCtxCookie> & Record<string, unknown>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.timeZone !== "string"
    ) {
      return null;
    }
    return {
      userId: parsed.userId,
      role: typeof parsed.role === "string" ? (parsed.role as ProfileRole) : null,
      timeZone: parsed.timeZone,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : null,
      // Retrocompatibilidade: cookies antigos não têm enabledModules → ambos habilitados
      enabledModules: parseEnabledModules(parsed.enabledModules ?? null),
    };
  } catch {
    return null;
  }
}

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const profileCtx = parseProfileCtxCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  if (!profileCtx?.userId) {
    redirect("/login");
  }

  const role = profileCtx.role;
  const timeZone = profileCtx.timeZone || DEFAULT_PROFILE_TIME_ZONE;
  const fullName = profileCtx.fullName;
  const userFirstName = fullName ? fullName.split(" ")[0] ?? null : null;
  const showAdminNav = canAccessAdminArea(role);
  const enabledModules = profileCtx.enabledModules ?? DEFAULT_ENABLED_MODULES;
  const pathname = headersList.get("x-pathname") ?? "";
  const onboardingOnly =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  return (
    <AppTimeZoneProvider timeZone={timeZone}>
      <Toaster />
      {onboardingOnly ? (
        <div className="bg-background min-h-screen">{children}</div>
      ) : (
        <AppShell
          showAdminNav={showAdminNav}
          userFirstName={userFirstName}
          enabledModules={enabledModules}
        >
          {children}
        </AppShell>
      )}
    </AppTimeZoneProvider>
  );
}
