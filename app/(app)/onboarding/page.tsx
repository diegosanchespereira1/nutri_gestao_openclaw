import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadChecklistCatalog } from "@/lib/actions/checklists";

export default async function OnboardingPage() {
  const { templates } = await loadChecklistCatalog();
  return <OnboardingWizard templates={templates} />;
}
