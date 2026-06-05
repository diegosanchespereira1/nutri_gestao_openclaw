import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { InicioClientReminder } from "@/components/dashboard/inicio-client-reminder";
import { InicioClinicalPanel } from "@/components/dashboard/inicio-clinical-panel";
import { InicioFinancialPanel } from "@/components/dashboard/inicio-financial-panel";
import {
  InicioClinicalPanelSkeleton,
  InicioFinancialPanelSkeleton,
} from "@/components/dashboard/inicio-panel-skeleton";
import { InicioWelcomeBanner } from "@/components/dashboard/inicio-welcome-banner";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { cn } from "@/lib/utils";

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bemvindo = sp.bemvindo === "1";
  const onboardingMinimal = sp.onboarding === "minimal";

  const { user } = await getServerContext();
  if (!user) {
    redirect("/login");
  }

  return (
    <PageLayout>
      <Suspense fallback={null}>
        <InicioClientReminder />
      </Suspense>

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
        <div className="flex gap-2">
          <Link
            href="/visitas/nova"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Agendar visita
          </Link>
          <Link
            href="/clientes/novo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Novo cliente
          </Link>
        </div>
      </div>

      <Suspense fallback={<InicioClinicalPanelSkeleton />}>
        <InicioClinicalPanel />
      </Suspense>

      <Suspense fallback={<InicioFinancialPanelSkeleton />}>
        <InicioFinancialPanel />
      </Suspense>
    </PageLayout>
  );
}
