import Link from "next/link";

import { ClientForm } from "@/components/clientes/client-form";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default function NovoClientePage() {
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
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo cliente
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          <strong className="text-foreground font-medium">Cliente</strong> aqui
          significa o teu{" "}
          <strong className="text-foreground font-medium">contrato na carteira</strong>
          : PF (particular) ou PJ (empresa que contrata — não é o
          estabelecimento; unidades adicionas-se depois na ficha). Em PF, nome,
          dados pessoais e notas de saúde iniciais ficam no mesmo separador; a
          ficha clínica completa é em{" "}
          <strong className="text-foreground font-medium">Pacientes</strong>{" "}
          após guardar.
        </p>
      </div>
      <ClientForm
        mode="create"
        defaultKind="pf"
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
    </div>
  );
}
