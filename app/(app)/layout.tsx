import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AppTimeZoneProvider } from "@/components/app-timezone-provider";
import { AppVersionGuard } from "@/components/app-version-guard";
import { Toaster } from "@/components/ui/sonner";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileShellContextCookie } from "@/lib/auth/profile-context-cookie";
import { canAccessAdminArea } from "@/lib/roles";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const profileCtx = parseProfileShellContextCookie(
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
      <AppVersionGuard />
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
