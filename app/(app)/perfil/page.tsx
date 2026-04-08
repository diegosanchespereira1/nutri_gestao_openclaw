import { PerfilForm } from "@/components/perfil-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { profileRoleLabel } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn, role")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Perfil profissional"
        description={`Nome e CRN usados em documentos e identificação. Papel: ${profileRoleLabel(profile?.role)}.`}
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <PerfilForm
        defaultFullName={profile?.full_name ?? ""}
        defaultCrn={profile?.crn ?? ""}
      />
    </PageLayout>
  );
}
