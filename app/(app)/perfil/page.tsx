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
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("full_name, crn, phone")
    .eq("member_user_id", user!.id)
    .maybeSingle();

  const effectiveFullName = String(profile?.full_name ?? "").trim()
    || String(teamMember?.full_name ?? "").trim();
  const effectiveCrn = String(profile?.crn ?? "").trim()
    || String(teamMember?.crn ?? "").trim();
  const effectivePhone = String(profile?.phone ?? "").trim()
    || String(teamMember?.phone ?? "").trim();

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
        defaultFullName={effectiveFullName}
        defaultEmail={user?.email ?? ""}
        pendingEmail={isEmailChangePending ? pendingEmail : null}
        defaultPhone={effectivePhone}
        defaultCrn={effectiveCrn}
        defaultPhotoUrl={defaultPhotoUrl}
      />
    </PageLayout>
  );
}
