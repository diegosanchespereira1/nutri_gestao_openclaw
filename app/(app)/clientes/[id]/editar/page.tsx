import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientExamDocumentList } from "@/components/clientes/client-exam-document-list";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientForm } from "@/components/clientes/client-form";
import { DeleteClientButton } from "@/components/clientes/delete-client-button";
import { EstablishmentsSection } from "@/components/clientes/establishments-section";
import { PatientsSection } from "@/components/pacientes/patients-section";
import { Separator } from "@/components/ui/separator";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { normalizeClientRow } from "@/lib/clients/normalize-client-row";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

function dateInputValue(isoOrDate: string | null): string {
  if (!isoOrDate) return "";
  return isoOrDate.slice(0, 10);
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = normalizeClientRow(data as Record<string, unknown>);
  const logoPreviewUrl = await getClientLogoSignedUrl(
    supabase,
    row.logo_storage_path,
  );

  const social = row.social_links ?? {};

  return (
    <div className="space-y-6">
      <Link
        href="/clientes"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        ← Clientes
      </Link>
      <div className="flex flex-wrap items-start gap-4">
        <ClientAvatar
          name={row.legal_name}
          imageUrl={logoPreviewUrl}
          size="lg"
        />
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Editar cliente
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {row.kind === "pf" ? "Pessoa física" : "Pessoa jurídica"} ·{" "}
            {row.legal_name}
            {row.kind === "pj" ? (
              <>
                {" "}
                ·{" "}
                <span className="text-foreground font-medium">
                  {row.lifecycle_status === "ativo"
                    ? "Ativo"
                    : row.lifecycle_status === "inativo"
                      ? "Inativo"
                      : "Finalizado"}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <ClientForm
        mode="edit"
        clientId={row.id}
        defaultKind={row.kind}
        defaultLegalName={row.legal_name}
        defaultTradeName={row.trade_name ?? ""}
        defaultDocumentId={row.document_id ?? ""}
        defaultEmail={row.email ?? ""}
        defaultPhone={row.phone ?? ""}
        defaultNotes={row.notes ?? ""}
        defaultAttendedFullName={row.attended_full_name ?? ""}
        defaultBirthDate={row.birth_date ?? ""}
        defaultSex={
          row.sex && (row.sex === "female" || row.sex === "male" || row.sex === "other")
            ? row.sex
            : ""
        }
        defaultDietaryRestrictions={row.dietary_restrictions ?? ""}
        defaultChronicMedications={row.chronic_medications ?? ""}
        defaultGuardianFullName={row.guardian_full_name ?? ""}
        defaultGuardianDocumentId={row.guardian_document_id ?? ""}
        defaultGuardianEmail={row.guardian_email ?? ""}
        defaultGuardianPhone={row.guardian_phone ?? ""}
        defaultGuardianRelationship={row.guardian_relationship ?? ""}
        defaultLifecycleStatus={row.lifecycle_status}
        defaultActivatedAt={dateInputValue(row.activated_at)}
        defaultStateRegistration={row.state_registration ?? ""}
        defaultMunicipalRegistration={row.municipal_registration ?? ""}
        defaultSanitaryLicense={row.sanitary_license ?? ""}
        defaultWebsiteUrl={row.website_url ?? ""}
        defaultSocialInstagram={social.instagram ?? ""}
        defaultSocialFacebook={social.facebook ?? ""}
        defaultSocialLinkedin={social.linkedin ?? ""}
        defaultSocialWhatsapp={social.whatsapp ?? ""}
        defaultSocialOther={social.other ?? ""}
        defaultLogoPreviewUrl={logoPreviewUrl}
        defaultLegalRepFullName={row.legal_rep_full_name ?? ""}
        defaultLegalRepDocumentId={row.legal_rep_document_id ?? ""}
        defaultLegalRepRole={row.legal_rep_role ?? ""}
        defaultLegalRepEmail={row.legal_rep_email ?? ""}
        defaultLegalRepPhone={row.legal_rep_phone ?? ""}
        defaultTechnicalRepFullName={row.technical_rep_full_name ?? ""}
        defaultTechnicalRepProfessionalId={
          row.technical_rep_professional_id ?? ""
        }
        defaultTechnicalRepEmail={row.technical_rep_email ?? ""}
        defaultTechnicalRepPhone={row.technical_rep_phone ?? ""}
        defaultBusinessSegment={row.business_segment ?? ""}
      />
      {row.kind === "pf" ? (
        <>
          <Separator />
          <ClientExamDocumentList clientId={row.id} />
          <Separator />
          <PatientsSection variant="client_pf" clientId={row.id} />
        </>
      ) : null}
      {row.kind === "pj" ? (
        <>
          <Separator />
          <EstablishmentsSection clientId={row.id} />
        </>
      ) : null}
      <Separator />
      <div>
        <h2 className="text-foreground text-sm font-medium">
          Zona de perigo
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Eliminar remove o cliente da sua carteira. Em versões futuras, dados
          ligados (estabelecimentos, pacientes) podem restringir esta ação.
        </p>
        <div className="mt-3">
          <DeleteClientButton clientId={row.id} />
        </div>
      </div>
    </div>
  );
}
