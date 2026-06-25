import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { buildOnboardingInitialValues } from "@/lib/onboarding/initial-values";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { profileNeedsOnboarding } from "@/lib/supabase/profile";
import { parseEnabledModules } from "@/lib/types/modules";

export default async function OnboardingPage() {
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const needsOnboarding = await profileNeedsOnboarding(supabase, user.id);
  if (!needsOnboarding) redirect("/inicio");

  const [{ templates }, { data: profile }] = await Promise.all([
    loadChecklistCatalog(),
    supabase
      .from("profiles")
      .select("tenant_name, full_name, crn, acquisition_source, enabled_modules")
      .eq("user_id", user.id)
      .maybeSingle(),
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
  });

  return (
    <OnboardingWizard templates={templates} initialValues={initialValues} />
  );
}
