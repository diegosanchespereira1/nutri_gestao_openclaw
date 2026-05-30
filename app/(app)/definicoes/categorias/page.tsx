import { redirect } from "next/navigation";

import { CustomSegmentsManager } from "@/components/clientes/custom-segments-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DefinicoesCategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [workspaceOwnerId, profileRow] = await Promise.all([
    getWorkspaceAccountOwnerId(supabase, user.id),
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  const canEdit =
    user.id === workspaceOwnerId || canAccessAdminArea(profileRow?.role);

  const { data: allSegments } = await supabase
    .from("client_custom_segments")
    .select("id, label, built_in_key")
    .eq("owner_user_id", workspaceOwnerId)
    .order("label", { ascending: true });

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

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Categorias de negócio"
        description="Gerencie as categorias usadas para classificar os seus clientes."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <CustomSegmentsManager
        initial={customSegments}
        builtIn={builtIn}
        canEdit={canEdit}
      />
    </PageLayout>
  );
}
