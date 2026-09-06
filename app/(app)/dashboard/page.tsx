import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { DashboardClientReminder } from "@/components/dashboard/dashboard-client-reminder";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardHomeSkeleton } from "@/components/dashboard/dashboard-panel-skeleton";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardWelcomeBanner } from "@/components/dashboard/dashboard-welcome-banner";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bemvindo = sp.bemvindo === "1";
  const onboardingMinimal = sp.onboarding === "minimal";
  const deferHeavyPanels = bemvindo || onboardingMinimal;

  const { user, supabase } = await getServerContext();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const fullName =
    typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  const userFirstName = fullName ? fullName.split(/\s+/)[0] ?? null : null;

  return (
    <PageLayout>
      {!deferHeavyPanels ? (
        <Suspense fallback={null}>
          <DashboardClientReminder />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <DashboardWelcomeBanner
          bemvindo={bemvindo}
          onboardingMinimal={onboardingMinimal}
        />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <AppShellUserGreeting firstName={userFirstName} />
          <h2 className="sr-only">Dashboard</h2>
        </div>
        <DashboardQuickActions />
      </div>

      {deferHeavyPanels ? (
        <Suspense
          fallback={
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                O painel completo carrega em seguida. Enquanto isso, use os
                atalhos acima para agendar uma visita ou cadastrar outro
                cliente.
              </p>
              <DashboardHomeSkeleton />
            </div>
          }
        >
          <DashboardHome />
        </Suspense>
      ) : (
        <Suspense fallback={<DashboardHomeSkeleton />}>
          <DashboardHome />
        </Suspense>
      )}
    </PageLayout>
  );
}
