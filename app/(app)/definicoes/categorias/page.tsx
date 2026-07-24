import { redirect } from "next/navigation";

import { CustomSegmentsManager } from "@/components/clientes/custom-segments-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { canManageTenantFully } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DefinicoesCategoriasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const [{ data: allSegments }, canEdit] = await Promise.all([
    supabase
      .from("client_custom_segments")
      .select("id, label, built_in_key")
      .eq("owner_user_id", workspaceOwnerId)
      .order("label", { ascending: true }),
    canManageTenantFully(supabase, user.id, workspaceOwnerId),
  ]);

  // Split into custom (no built_in_key) and built-in overrides
  const customSegments = (allSegments ?? [])
    .filter((s) => !s.built_in_key)
    .map((s) => ({ id: s.id, label: s.label }));

  const overrideMap = new Map(
    (allSegments ?? [])
      .filter((s) => s.built_in_key)
      .map((s) => [s.built_in_key as string, { id: s.id, label: s.label }]),
  );

  const builtIn = CLIENT_BUSINESS_SEGMENTS.map((key) => ({
    key,
    defaultLabel: clientBusinessSegmentLabel[key],
    currentLabel: overrideMap.get(key)?.label ?? clientBusinessSegmentLabel[key],
    isOverridden: overrideMap.has(key),
  }));

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/categorias",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Categorias de negócio"
        description="Gerencie as categorias usadas para classificar os seus clientes."
        back={back}
      />
      <CustomSegmentsManager
        initial={customSegments}
        builtIn={builtIn}
        canEdit={canEdit}
      />
    </PageLayout>
  );
}
