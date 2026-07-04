import { PerfilForm } from "@/components/perfil-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/constants/profile-photos-storage";
import { PROFESSIONAL_SIGNATURES_BUCKET } from "@/lib/constants/professional-signatures-storage";
import { profileRoleLabel } from "@/lib/roles";
import { getServerContext } from "@/lib/supabase/get-server-user";

export default async function PerfilPage() {
  const { supabase, user: ctxUser } = await getServerContext();
  if (!ctxUser) return null;

  // Busca o user completo (para new_email) em paralelo com os dados do perfil
  const [
    { data: { user } },
    { data: profile },
    { data: teamMember },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("full_name, crn, phone, photo_storage_path, signature_storage_path, role")
      .eq("user_id", ctxUser.id)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select("full_name, crn, phone")
      .eq("member_user_id", ctxUser.id)
      .maybeSingle(),
  ]);

  const pendingEmail =
    typeof user?.new_email === "string" ? user.new_email.trim() : "";
  const isEmailChangePending =
    pendingEmail.length > 0 &&
    pendingEmail.toLowerCase() !== (user?.email ?? "").trim().toLowerCase();

  const effectiveFullName =
    String(profile?.full_name ?? "").trim() ||
    String(teamMember?.full_name ?? "").trim();
  const effectiveCrn =
    String(profile?.crn ?? "").trim() ||
    String(teamMember?.crn ?? "").trim();
  const effectivePhone =
    String(profile?.phone ?? "").trim() ||
    String(teamMember?.phone ?? "").trim();

  let defaultPhotoUrl: string | null = null;
  if (profile?.photo_storage_path) {
    const { data } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrl(profile.photo_storage_path, 60 * 60);
    defaultPhotoUrl = data?.signedUrl ?? null;
  }

  let defaultSignatureUrl: string | null = null;
  const signaturePath = (profile as { signature_storage_path?: string | null } | null)
    ?.signature_storage_path;
  if (signaturePath) {
    const { data } = await supabase.storage
      .from(PROFESSIONAL_SIGNATURES_BUCKET)
      .createSignedUrl(signaturePath, 60 * 60);
    defaultSignatureUrl = data?.signedUrl ?? null;
  }

  const roleLabel = profileRoleLabel(profile?.role);

  return (
    <PageLayout>
      <PageHeader
        title="Perfil profissional"
        description="Gerencie seus dados de identificação, foto, assinatura e segurança da conta."
      />
      <PerfilForm
        defaultFullName={effectiveFullName}
        defaultEmail={user?.email ?? ""}
        pendingEmail={isEmailChangePending ? pendingEmail : null}
        defaultPhone={effectivePhone}
        defaultCrn={effectiveCrn}
        defaultPhotoUrl={defaultPhotoUrl}
        defaultSignatureUrl={defaultSignatureUrl}
        roleLabel={roleLabel}
      />
    </PageLayout>
  );
}
