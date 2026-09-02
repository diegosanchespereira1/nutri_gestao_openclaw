import { parseTeamJobRole } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";

export type ParsedTeamMemberJobRoleForm =
  | { ok: true; memberId: string; profileId: string; jobRole: TeamJobRole }
  | { ok: false };

export function parseTeamMemberJobRoleForm(
  formData: FormData,
): ParsedTeamMemberJobRoleForm {
  const memberId = String(formData.get("member_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const jobRole = parseTeamJobRole(formData.get("job_role"));

  if (!memberId || !profileId || !jobRole) {
    return { ok: false };
  }

  return { ok: true, memberId, profileId, jobRole };
}
