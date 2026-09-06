import { redirect } from "next/navigation";

import { DashboardPreviewClient } from "@/components/dashboard/preview/dashboard-preview-client";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";

export default async function DashboardPreviewPage() {
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
      <DashboardPreviewClient
        firstName={userFirstName}
        referenceIso={new Date().toISOString()}
      />
    </PageLayout>
  );
}
