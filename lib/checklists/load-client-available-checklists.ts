import { listCustomTemplatesForOwner } from "@/lib/actions/checklist-custom";
import { loadWorkspaceTemplatesForCatalogLight } from "@/lib/actions/checklist-workspace";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import {
  assembleClientAvailableChecklists,
  type ClientAvailableChecklist,
} from "@/lib/checklists/client-available-templates";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import { filterWorkspaceTemplatesForEstablishmentClient } from "@/lib/checklists/workspace-template-client-scope";
import { getServerContext } from "@/lib/supabase/get-server-user";
import type { EstablishmentTypeValue } from "@/lib/types/establishments";

export type ClientAvailableChecklistsResult = {
  establishment: { id: string; name: string } | null;
  items: ClientAvailableChecklist[];
};

export async function loadChecklistsAvailableForClient(
  clientId: string,
): Promise<ClientAvailableChecklistsResult> {
  const empty: ClientAvailableChecklistsResult = {
    establishment: null,
    items: [],
  };

  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return empty;

  const [{ data: client }, { data: establishment }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, kind, owner_user_id")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("establishments")
      .select("id, name, state, establishment_type, client_id")
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  if (!client || client.kind !== "pj" || client.owner_user_id !== workspaceOwnerId) {
    return empty;
  }
  if (!establishment) return empty;

  const establishmentId = String(establishment.id);
  const establishmentState =
    establishment.state != null ? String(establishment.state) : null;
  const establishmentType = String(
    establishment.establishment_type ?? "",
  ) as EstablishmentTypeValue;
  const [
    { templates: official },
    { rows: workspaceRows },
    { rows: customRows },
  ] = await Promise.all([
    loadChecklistCatalog(),
    loadWorkspaceTemplatesForCatalogLight(),
    listCustomTemplatesForOwner(),
  ]);

  const workspace = filterWorkspaceTemplatesForEstablishmentClient(
    workspaceRows.filter((row) => !row.is_draft && !row.is_archived),
    clientId,
  );
  const custom = customRows.filter(
    (row) => !row.is_archived && row.establishment_id === establishmentId,
  );
  const system = filterTemplatesForEstablishment(official, {
    state: establishmentState,
    establishment_type: establishmentType,
  });

  return {
    establishment: { id: establishmentId, name: String(establishment.name) },
    items: assembleClientAvailableChecklists({
      workspace,
      custom,
      official: system,
    }),
  };
}
