import { redirect } from "next/navigation";

import { AppBuildLabel, AppVersionGuard } from "@/components/app-version-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { Toaster } from "@/components/ui/sonner";
import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileRole } from "@/lib/supabase/profile";

export default async function AdminAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const role = await fetchProfileRole(supabase, user.id);
  if (!canAccessAdminArea(role)) {
    redirect(APP_DASHBOARD_PATH);
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppVersionGuard />
      <Toaster />
      <header className="border-border flex h-14 items-center gap-4 border-b px-4 md:px-6">
        <span className="font-heading text-base font-semibold tracking-tight">
          NutriGestão — Admin
        </span>
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <LogoutButton className="w-auto" />
          <AppBuildLabel />
        </div>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
