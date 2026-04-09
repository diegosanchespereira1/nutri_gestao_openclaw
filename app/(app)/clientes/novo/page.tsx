import { ClientForm } from "@/components/clientes/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

export default function NovoClientePage() {
  return (
    <PageLayout variant="form">
      <PageHeader
        title="Novo cliente"
        description="Empresa, hospital ou clínica (pessoa jurídica). Estabelecimentos e pacientes associam-se depois. Para pacientes individuais, use o módulo Pacientes."
        back={{ href: "/clientes", label: "Clientes" }}
      />
      <ClientForm
        mode="create"
        defaultKind="pj"
        lockKind
        defaultLegalName=""
        defaultTradeName=""
        defaultDocumentId=""
        defaultEmail=""
        defaultPhone=""
        defaultNotes=""
        defaultAttendedFullName=""
        defaultBirthDate=""
        defaultSex=""
        defaultDietaryRestrictions=""
        defaultChronicMedications=""
        defaultGuardianFullName=""
        defaultGuardianDocumentId=""
        defaultGuardianEmail=""
        defaultGuardianPhone=""
        defaultGuardianRelationship=""
        defaultLifecycleStatus="ativo"
        defaultActivatedAt=""
        defaultStateRegistration=""
        defaultMunicipalRegistration=""
        defaultSanitaryLicense=""
        defaultWebsiteUrl=""
        defaultSocialInstagram=""
        defaultSocialFacebook=""
        defaultSocialLinkedin=""
        defaultSocialWhatsapp=""
        defaultSocialOther=""
        defaultLogoPreviewUrl={null}
        defaultLegalRepFullName=""
        defaultLegalRepDocumentId=""
        defaultLegalRepRole=""
        defaultLegalRepEmail=""
        defaultLegalRepPhone=""
        defaultTechnicalRepFullName=""
        defaultTechnicalRepProfessionalId=""
        defaultTechnicalRepEmail=""
        defaultTechnicalRepPhone=""
        defaultBusinessSegment=""
      />
    </PageLayout>
  );
}
