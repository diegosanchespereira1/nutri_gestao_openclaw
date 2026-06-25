import { headers } from "next/headers";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ModuleBlockedUrlHandler } from "@/components/modules/module-blocked-url-handler";
import { ModuleGateProvider } from "@/components/modules/module-gate-provider";
import { EnabledModulesProvider } from "@/components/providers/enabled-modules-provider";
import { AppTimeZoneProvider } from "@/components/app-timezone-provider";
import { AppVersionGuard } from "@/components/app-version-guard";
import { Toaster } from "@/components/ui/sonner";
import { resolveAppShellContext } from "@/lib/auth/resolve-app-shell-context";
import { buildLoginRedirectPath } from "@/lib/auth/safe-next-path";
import { canAccessAdminArea } from "@/lib/roles";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profileCtx, headersList] = await Promise.all([
    resolveAppShellContext(),
    headers(),
  ]);
  const pathname = headersList.get("x-pathname") ?? "";
  if (!profileCtx?.userId) {
    redirect(buildLoginRedirectPath(pathname || "/inicio"));
  }

  const role = profileCtx.role;
  const timeZone = profileCtx.timeZone || DEFAULT_PROFILE_TIME_ZONE;
  const fullName = profileCtx.fullName;
  const userFirstName = fullName ? fullName.split(" ")[0] ?? null : null;
  const showAdminNav = canAccessAdminArea(role);
  const enabledModules = profileCtx.enabledModules ?? DEFAULT_ENABLED_MODULES;
  const onboardingOnly =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  return (
    <AppTimeZoneProvider timeZone={timeZone}>
      <EnabledModulesProvider value={enabledModules}>
        <ModuleGateProvider enabledModules={enabledModules}>
          <AppVersionGuard />
          <Toaster />
          <Suspense fallback={null}>
            <ModuleBlockedUrlHandler />
          </Suspense>
          {onboardingOnly ? (
            <div className="bg-background safe-top min-h-screen">{children}</div>
          ) : (
            <AppShell
              showAdminNav={showAdminNav}
              userFirstName={userFirstName}
            >
              {children}
            </AppShell>
          )}
        </ModuleGateProvider>
      </EnabledModulesProvider>
    </AppTimeZoneProvider>
  );
}
