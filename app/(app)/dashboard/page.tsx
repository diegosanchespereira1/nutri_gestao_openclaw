import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { DashboardClientReminder } from "@/components/dashboard/dashboard-client-reminder";
import { DashboardClinicalPanel } from "@/components/dashboard/dashboard-clinical-panel";
import { DashboardFinancialPanel } from "@/components/dashboard/dashboard-financial-panel";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import {
  DashboardClinicalPanelSkeleton,
  DashboardFinancialPanelSkeleton,
} from "@/components/dashboard/dashboard-panel-skeleton";
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppShellUserGreeting firstName={userFirstName} />
          <DashboardQuickActions />
        </div>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary size-4" aria-hidden />
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
        </div>
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
              <DashboardClinicalPanelSkeleton />
              <DashboardFinancialPanelSkeleton />
            </div>
          }
        >
          <DashboardPostWelcomePanels />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={<DashboardClinicalPanelSkeleton />}>
            <DashboardClinicalPanel />
          </Suspense>

          <Suspense fallback={<DashboardFinancialPanelSkeleton />}>
            <DashboardFinancialPanel />
          </Suspense>
        </>
      )}
    </PageLayout>
  );
}

async function DashboardPostWelcomePanels() {
  return (
    <>
      <DashboardClinicalPanel />
      <DashboardFinancialPanel />
    </>
  );
}
