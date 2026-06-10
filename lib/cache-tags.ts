/** Tag para `revalidateTag` / `unstable_cache` — alertas de validade de checklist. */
export function checklistValidityAlertsCacheTag(workspaceOwnerId: string): string {
  return `checklist-validity-alerts:${workspaceOwnerId}`;
}
