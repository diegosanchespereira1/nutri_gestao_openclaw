"use server";

import {
  loadChecklistPageData,
  type ChecklistPageCatalogData,
} from "@/lib/checklists/load-page-data";

export type { ChecklistPageCatalogData };

/** Wrapper para chamadas do cliente (ex.: refresh manual). Preferir `loadChecklistPageData` em RSC. */
export async function loadChecklistPageDataAction(input?: {
  initialEstablishmentId?: string | null;
}): Promise<ChecklistPageCatalogData> {
  return loadChecklistPageData(input);
}
