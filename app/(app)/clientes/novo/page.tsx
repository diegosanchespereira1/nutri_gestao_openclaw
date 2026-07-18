import { ClientForm } from "@/components/clientes/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadCustomSegmentsAction } from "@/lib/actions/client-segments";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [customSegments, teamMembersForSelect] = await Promise.all([
    loadCustomSegmentsAction(),
    loadTeamMembersForSelect(),
  ]);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/clientes",
    fallbackLabel: "Clientes",
    currentPath: "/clientes/novo",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Novo cliente"
        description="Empresa, hospital ou clínica (pessoa jurídica). Estabelecimentos e pacientes associam-se depois. Para pacientes individuais, use o módulo Pacientes."
        back={back}
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
