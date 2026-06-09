import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { profileNeedsOnboarding } from "@/lib/supabase/profile";

export default async function OnboardingPage() {
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const needsOnboarding = await profileNeedsOnboarding(supabase, user.id);
  if (!needsOnboarding) redirect("/inicio");

  const { templates } = await loadChecklistCatalog();
  return <OnboardingWizard templates={templates} />;
}
