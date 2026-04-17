// Story 9.3 — Visualização no portal externo
// Acesso por magic link token (?token=xxx). Mostra apenas dados autorizados pelo profissional.

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon } from "lucide-react";

async function resolvePortalAccess(token: string) {
  const supabase = await createClient();

  // Validate token and check expiry
  const { data: extUser } = await supabase
    .from("external_portal_users")
    .select("id, owner_user_id, full_name, patient_id, role, magic_link_expires_at, is_active")
    .eq("magic_link_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (!extUser) return null;

  const now = new Date();
  if (
    extUser.magic_link_expires_at &&
    new Date(extUser.magic_link_expires_at) < now
  ) {
    return null; // Token expired
  }

  // Update last_access_at (fire and forget)
  supabase
    .from("external_portal_users")
    .update({ last_access_at: now.toISOString() })
    .eq("id", extUser.id)
    .then(() => {});

  return extUser;
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-xl font-semibold">
          Acesso ao portal
        </h1>
        <p className="text-muted-foreground text-sm">
          Link de acesso inválido ou não fornecido. Por favor, utilize o link
          enviado pelo seu nutricionista.
        </p>
      </div>
    );
  }

  const extUser = await resolvePortalAccess(token);

  if (!extUser) {
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-xl font-semibold">
          Link inválido ou expirado
        </h1>
        <p className="text-muted-foreground text-sm">
          Este link de acesso expirou ou é inválido. Solicite um novo link ao
          seu nutricionista.
        </p>
      </div>
    );
  }

  // Load permissions for this external user
  const supabase = await createClient();
  const { data: permissions } = await supabase
    .from("external_access_permissions")
    .select("*")
    .eq("external_user_id", extUser.id)
    .eq("owner_user_id", extUser.owner_user_id);

  // Load patient data if access is linked to a patient
  let patientInfo: { full_name: string; birth_date: string | null } | null =
    null;
  if (extUser.patient_id) {
    const { data } = await supabase
      .from("patients")
      .select("full_name, birth_date")
      .eq("id", extUser.patient_id)
      .eq("owner_user_id", extUser.owner_user_id)
      .maybeSingle();
    patientInfo = data;
  }

  const perm = permissions?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="text-primary h-5 w-5" />
        <h1 className="text-foreground text-xl font-semibold">
          Olá, {extUser.full_name}
        </h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Você está no portal de acompanhamento. Apenas as informações autorizadas
        pelo profissional responsável são exibidas aqui.
      </p>

      {patientInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paciente</CardTitle>
            <CardDescription>
              {patientInfo.full_name}
              {patientInfo.birth_date && (
                <>
                  {" "}
                  · Nascimento:{" "}
                  {patientInfo.birth_date.split("-").reverse().join("/")}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!perm ? (
              <p className="text-muted-foreground text-sm">
                Ainda não há permissões de visualização configuradas pelo
                profissional para esta conta.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                <PermissionBadge
                  label="Relatórios"
                  allowed={perm.can_view_reports}
                />
                <PermissionBadge
                  label="Medições"
                  allowed={perm.can_view_measurements}
                />
                <PermissionBadge
                  label="Exames"
                  allowed={perm.can_view_exams}
                />
                <PermissionBadge
                  label="Plano nutricional"
                  allowed={perm.can_view_nutrition_plan}
                />
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!patientInfo && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center text-sm">
              Não há dados específicos de paciente vinculados a este acesso.
              Contacte o profissional responsável.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        Por razões de privacidade e segurança (LGPD), este acesso é temporário e
        controlado pelo profissional. Os dados são de uso exclusivo para
        acompanhamento.
      </p>
    </div>
  );
}

function PermissionBadge({
  label,
  allowed,
}: {
  label: string;
  allowed: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      <Badge variant={allowed ? "default" : "secondary"}>
        {allowed ? "✓" : "✗"}
      </Badge>
      <span className={allowed ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}
