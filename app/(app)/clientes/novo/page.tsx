import { ClientForm } from "@/components/clientes/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadCustomSegmentsAction } from "@/lib/actions/client-segments";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";

export default async function NovoClientePage() {
  const [customSegments, teamMembersForSelect] = await Promise.all([
    loadCustomSegmentsAction(),
    loadTeamMembersForSelect(),
  ]);

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
        defaultCustomSegments={customSegments}
        teamMembersForSelect={teamMembersForSelect}
        defaultResponsibleTeamMemberId={null}
        defaultEstName=""
        defaultEstAddressLine1=""
        defaultEstAddressLine2=""
        defaultEstCity=""
        defaultEstState=""
        defaultEstPostalCode=""
      />
    </PageLayout>
  );
}
