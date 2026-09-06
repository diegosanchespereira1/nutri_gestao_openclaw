import Link from "next/link";
import { cookies } from "next/headers";
import { ClipboardCheck } from "lucide-react";

import { ChecklistValidityAlertGroups } from "@/components/dashboard/checklist-validity-alert-groups";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { VALIDITY_ALERTS_LIST_LIMIT } from "@/lib/checklists/validity-alerts-balance";
import {
  APP_DASHBOARD_PATH,
  CHECKLISTS_A_VENCER_PATH,
  CHECKLISTS_VENCIDOS_PATH,
} from "@/lib/routes";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import type { ChecklistValidityAlertStatus } from "@/lib/types/checklist-validity-alerts";
import { cn } from "@/lib/utils";

type Variant = ChecklistValidityAlertStatus;

const COPY: Record<
  Variant,
  {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    otherHref: string;
    otherLabel: string;
    currentPath: string;
  }
> = {
  vencido: {
    title: "Checklists vencidos",
    description:
      "Itens com validade expirada no último ano. Toque num card para abrir o dossiê.",
    emptyTitle: "Nenhum checklist vencido",
    emptyDescription:
      "Não há itens com validade expirada no último ano. Os que estão a chegar aparecem em A vencer.",
    otherHref: CHECKLISTS_A_VENCER_PATH,
    otherLabel: "Ver a vencer",
    currentPath: CHECKLISTS_VENCIDOS_PATH,
  },
  proximo: {
    title: "Checklists a vencer",
    description:
      "Itens com validade nos próximos 90 dias. Toque num card para abrir o dossiê.",
    emptyTitle: "Nenhum checklist a vencer",
    emptyDescription:
      "Não há itens com validade nos próximos 90 dias. Os que já expiraram aparecem em Vencidos.",
    otherHref: CHECKLISTS_VENCIDOS_PATH,
    otherLabel: "Ver vencidos",
    currentPath: CHECKLISTS_A_VENCER_PATH,
  },
};

export async function ChecklistValidityListPage({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
  const cookieStore = await cookies();
  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const tz = profileCtx?.timeZone
    ? normalizeAppTimeZone(profileCtx.timeZone)
    : DEFAULT_PROFILE_TIME_ZONE;

  const alerts = await loadChecklistValidityAlerts(tz, {
    status: variant,
    limit: VALIDITY_ALERTS_LIST_LIMIT,
  });

  return (
    <PageLayout>
      <PageHeader
        title={copy.title}
        description={copy.description}
        back={{ href: APP_DASHBOARD_PATH, label: "Dashboard" }}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href={copy.otherHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              {copy.otherLabel}
            </Link>
            <Link
              href="/checklists"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              Catálogo
            </Link>
          </div>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          action={
            <Link
              href={copy.otherHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "min-h-11 justify-center",
              )}
            >
              {copy.otherLabel}
            </Link>
          }
        />
      ) : (
        <ChecklistValidityAlertGroups
          alerts={alerts}
          timeZone={tz}
          hideStatusFilter
          returnTo={copy.currentPath}
        />
      )}
    </PageLayout>
  );
}
