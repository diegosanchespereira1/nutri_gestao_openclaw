"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { updateTeamMemberJobRoleAction } from "@/lib/actions/admin-platform";
import { TEAM_JOB_ROLES, teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";
import { cn } from "@/lib/utils";

type Props = {
  memberId: string;
  profileId: string;
  currentRole: TeamJobRole;
  memberName: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={pending}
    >
      {pending ? "Salvando…" : "Salvar cargo"}
    </Button>
  );
}

export function TenantMemberRoleForm({
  memberId,
  profileId,
  currentRole,
  memberName,
}: Props) {
  const selectId = `job-role-${memberId}`;

  return (
    <form
      action={updateTeamMemberJobRoleAction}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="profile_id" value={profileId} />
      <label htmlFor={selectId} className="sr-only">
        Cargo de {memberName}
      </label>
      <select
        id={selectId}
        name="job_role"
        defaultValue={currentRole}
        className={cn(
          "border-input bg-background text-foreground h-7 max-w-[11.5rem] rounded-md border px-2 text-xs",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        {TEAM_JOB_ROLES.map((role) => (
          <option key={role} value={role}>
            {teamJobRoleLabel[role]}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  );
}
