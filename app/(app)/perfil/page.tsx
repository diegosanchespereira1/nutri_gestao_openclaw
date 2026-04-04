import { PerfilForm } from "@/components/perfil-form";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Perfil profissional
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nome e CRN usados em documentos e identificação na plataforma.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          <span className="text-foreground font-medium">Papel na plataforma:</span>{" "}
          {profileRoleLabel(profile?.role)}
          <span className="text-muted-foreground/80"> (definido pelo administrador)</span>
        </p>
      </div>
      <PerfilForm
        defaultFullName={profile?.full_name ?? ""}
        defaultCrn={profile?.crn ?? ""}
      />
    </div>
  );
}
