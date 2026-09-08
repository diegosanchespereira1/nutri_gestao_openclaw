import { redirect } from "next/navigation";

import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { buildOnboardingInitialValues } from "@/lib/onboarding/initial-values";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { profileNeedsOnboarding } from "@/lib/supabase/profile";
import { parseEnabledModules } from "@/lib/types/modules";

export default async function OnboardingPage() {
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const needsOnboarding = await profileNeedsOnboarding(supabase, user.id);
  if (!needsOnboarding) redirect(APP_DASHBOARD_PATH);

  const [{ data: profile }, workspaceOwnerId] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "tenant_name, full_name, crn, acquisition_source, enabled_modules, document_kind, document_id",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    getWorkspaceAccountOwnerId(supabase, user.id),
  ]);

  const initialValues = buildOnboardingInitialValues({
    tenantName:
      typeof profile?.tenant_name === "string" ? profile.tenant_name : null,
    fullName:
      typeof profile?.full_name === "string" ? profile.full_name : null,
    crn: typeof profile?.crn === "string" ? profile.crn : null,
    acquisitionSource:
      typeof profile?.acquisition_source === "string"
        ? profile.acquisition_source
        : null,
    enabledModules: parseEnabledModules(
      (profile as Record<string, unknown> | null)?.enabled_modules,
    ),
    documentKind:
      typeof profile?.document_kind === "string" ? profile.document_kind : null,
    documentId:
      typeof profile?.document_id === "string" ? profile.document_id : null,
    isAccountOwner: workspaceOwnerId === user.id,
  });

  return (
    <OnboardingWizard initialValues={initialValues} />
  );
}
