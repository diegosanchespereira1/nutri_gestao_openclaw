import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

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

  const { user } = await getServerContext();
  if (!user) {
    redirect("/login");
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary size-5" aria-hidden />
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
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
