"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
} from "@/lib/actions/team-members";
import { TEAM_JOB_ROLES, teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { ProfessionalArea, TeamMemberRow } from "@/lib/types/team-members";

// Dentro do Card (bg-card = branco), select e textarea usam bg-card para consistência
const selectClassName =
  "border-input bg-card text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type Props = {
  mode: "create" | "edit";
  initial?: TeamMemberRow | null;
};

export function TeamMemberForm({ mode, initial }: Props) {
  const [area, setArea] = useState<ProfessionalArea>(
    initial?.professional_area ?? "nutrition",
  );

  const action =
    mode === "create" ? createTeamMemberAction : updateTeamMemberAction;

  return (
    <form action={action} className="max-w-lg space-y-6">
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="tm-name">Nome completo</Label>
        <Input
          id="tm-name"
          name="full_name"
          required
          minLength={2}
          defaultValue={initial?.full_name ?? ""}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tm-email">Email (opcional)</Label>
        <Input
          id="tm-email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tm-phone">Telefone (opcional)</Label>
        <Input
          id="tm-phone"
          name="phone"
          type="tel"
          defaultValue={initial?.phone ?? ""}
          autoComplete="tel"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Área profissional
        </legend>
        <p className="text-muted-foreground text-xs">
          Fora da nutrição, o CRN não é obrigatório.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="professional_area"
              value="nutrition"
              checked={area === "nutrition"}
              onChange={() => setArea("nutrition")}
              required
              className="h-4 w-4"
            />
            Nutrição / saúde
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="professional_area"
              value="other"
              checked={area === "other"}
              onChange={() => setArea("other")}
              required
              className="h-4 w-4"
            />
            Outra área
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="tm-role">Cargo</Label>
        <select
          id="tm-role"
          name="job_role"
          className={selectClassName}
          required
          defaultValue={initial?.job_role ?? "nutricionista"}
        >
          {TEAM_JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {teamJobRoleLabel[r]}
            </option>
          ))}
        </select>
      </div>

      {area === "nutrition" ? (
        <div className="space-y-2">
          <Label htmlFor="tm-crn">CRN (obrigatório na nutrição)</Label>
          <Input
            id="tm-crn"
            name="crn"
            required={area === "nutrition"}
            defaultValue={initial?.crn ?? ""}
            autoComplete="off"
          />
        </div>
      ) : (
        <input type="hidden" name="crn" value="" />
      )}

      <div className="space-y-2">
        <Label htmlFor="tm-notes">Notas internas (opcional)</Label>
        <textarea
          id="tm-notes"
          name="notes"
          rows={2}
          className={textareaClass}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      <Button type="submit">
        {mode === "create" ? "Adicionar membro" : "Guardar alterações"}
      </Button>
    </form>
  );
}
