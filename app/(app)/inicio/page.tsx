import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { InicioClientReminder } from "@/components/dashboard/inicio-client-reminder";
import { InicioClinicalPanel } from "@/components/dashboard/inicio-clinical-panel";
import { InicioFinancialPanel } from "@/components/dashboard/inicio-financial-panel";
import { InicioQuickActions } from "@/components/dashboard/inicio-quick-actions";
import {
  InicioClinicalPanelSkeleton,
  InicioFinancialPanelSkeleton,
} from "@/components/dashboard/inicio-panel-skeleton";
import { InicioWelcomeBanner } from "@/components/dashboard/inicio-welcome-banner";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";

export default async function InicioPage({
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
          <InicioClientReminder />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <InicioWelcomeBanner
          bemvindo={bemvindo}
          onboardingMinimal={onboardingMinimal}
        />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary size-5" aria-hidden />
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Início
          </h1>
        </div>
        <InicioQuickActions />
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
              <InicioClinicalPanelSkeleton />
              <InicioFinancialPanelSkeleton />
            </div>
          }
        >
          <InicioPostWelcomePanels />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={<InicioClinicalPanelSkeleton />}>
            <InicioClinicalPanel />
          </Suspense>

          <Suspense fallback={<InicioFinancialPanelSkeleton />}>
            <InicioFinancialPanel />
          </Suspense>
        </>
      )}
    </PageLayout>
  );
}

async function InicioPostWelcomePanels() {
  return (
    <>
      <InicioClinicalPanel />
      <InicioFinancialPanel />
    </>
  );
}
