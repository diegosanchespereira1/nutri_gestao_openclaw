import { MfaSettings } from "@/components/mfa-settings";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

export default async function SegurancaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/seguranca",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Segurança"
        description="Gestão de autenticação em dois fatores (TOTP)."
        back={back}
      />
      <MfaSettings />
    </PageLayout>
  );
}
