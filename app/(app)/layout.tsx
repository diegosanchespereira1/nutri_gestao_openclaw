import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AppTimeZoneProvider } from "@/components/app-timezone-provider";
import { Toaster } from "@/components/ui/sonner";
import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileRoleAndTimeZone } from "@/lib/supabase/profile";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ role, timeZone }, headersList] = await Promise.all([
    fetchProfileRoleAndTimeZone(supabase, user.id),
    headers(),
  ]);
  const showAdminNav = canAccessAdminArea(role);
  const pathname = headersList.get("x-pathname") ?? "";
  const onboardingOnly =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  return (
    <AppTimeZoneProvider timeZone={timeZone}>
      <Toaster />
      {onboardingOnly ? (
        <div className="bg-background min-h-screen">{children}</div>
      ) : (
        <AppShell showAdminNav={showAdminNav}>{children}</AppShell>
      )}
    </AppTimeZoneProvider>
  );
}
