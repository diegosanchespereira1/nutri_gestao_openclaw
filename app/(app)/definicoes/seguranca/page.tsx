import { MfaSettings } from "@/components/mfa-settings";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

export default function SegurancaPage() {
  return (
    <PageLayout variant="form">
      <PageHeader
        title="Segurança"
        description="Gestão de autenticação em dois fatores (TOTP)."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <MfaSettings />
    </PageLayout>
  );
}
