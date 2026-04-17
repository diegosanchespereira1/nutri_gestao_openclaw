import { PerfilForm } from "@/components/perfil-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/constants/profile-photos-storage";
import { profileRoleLabel } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pendingEmail =
    typeof user?.new_email === "string" ? user.new_email.trim() : "";
  const isEmailChangePending =
    pendingEmail.length > 0 &&
    pendingEmail.toLowerCase() !== (user?.email ?? "").trim().toLowerCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn, phone, photo_storage_path, role")
    .eq("user_id", user!.id)
    .maybeSingle();

  let defaultPhotoUrl: string | null = null;
  if (profile?.photo_storage_path) {
    const { data } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrl(profile.photo_storage_path, 60 * 60);
    defaultPhotoUrl = data?.signedUrl ?? null;
  }

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Perfil profissional"
        description={`Nome e CRN usados em documentos e identificação. Papel: ${profileRoleLabel(profile?.role)}.`}
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <PerfilForm
        defaultFullName={profile?.full_name ?? ""}
        defaultEmail={user?.email ?? ""}
        pendingEmail={isEmailChangePending ? pendingEmail : null}
        defaultPhone={profile?.phone ?? ""}
        defaultCrn={profile?.crn ?? ""}
        defaultPhotoUrl={defaultPhotoUrl}
      />
    </PageLayout>
  );
}
