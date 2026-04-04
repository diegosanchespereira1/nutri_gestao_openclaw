import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
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
    redirect("/inicio");
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border flex h-14 items-center gap-4 border-b px-4 md:px-6">
        <span className="font-heading text-base font-semibold tracking-tight">
          NutriGestão — Admin
        </span>
        <div className="ml-auto">
          <LogoutButton className="w-auto" />
        </div>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
