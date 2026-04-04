import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AppTimeZoneProvider } from "@/components/app-timezone-provider";
import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  fetchProfileRole,
  fetchProfileTimeZone,
} from "@/lib/supabase/profile";

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

  const [role, timeZone] = await Promise.all([
    fetchProfileRole(supabase, user.id),
    fetchProfileTimeZone(supabase, user.id),
  ]);
  const showAdminNav = canAccessAdminArea(role);

  return (
    <AppTimeZoneProvider timeZone={timeZone}>
      <AppShell showAdminNav={showAdminNav}>{children}</AppShell>
    </AppTimeZoneProvider>
  );
}
