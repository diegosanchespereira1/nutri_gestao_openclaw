import { cookies } from "next/headers";

import { ContractRenewalAlerts } from "@/components/dashboard/contract-renewal-alerts";
import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { FinancialPendingCard } from "@/components/dashboard/financial-pending-card";
import { InicioFinancialPanelLocked } from "@/components/dashboard/inicio-financial-panel-locked";
import { loadFinancialDashboardSummary } from "@/lib/actions/financial-charges";
import { loadExpiringContracts } from "@/lib/actions/client-contracts";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

export async function InicioFinancialPanel() {
  const cookieStore = await cookies();
  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const enabledModules =
    profileCtx?.enabledModules ?? DEFAULT_ENABLED_MODULES;

  if (!enabledModules.financeiro) {
    return <InicioFinancialPanelLocked />;
  }

  const tz = profileCtx?.timeZone
    ? normalizeAppTimeZone(profileCtx.timeZone)
    : DEFAULT_PROFILE_TIME_ZONE;

  const [financialSummary, { rows: expiringContracts }] = await Promise.all([
    loadFinancialDashboardSummary(tz),
    loadExpiringContracts(60),
  ]);

  return (
    <DashboardFocusPanel
      labelledById="dashboard-financial-heading"
      tone="financial"
      title="Financeiro"
      description="Cobranças, contratos e alertas de renovação."
    >
      {expiringContracts.length > 0 && (
        <ContractRenewalAlerts rows={expiringContracts} withinDays={60} />
      )}
      <FinancialPendingCard
        overdueCount={financialSummary.overdueCount}
        overdueTotalLabel={financialSummary.overdueTotalLabel}
      />
    </DashboardFocusPanel>
  );
}
