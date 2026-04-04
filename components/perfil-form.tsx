"use client";

import { useActionState } from "react";

import {
  type UpdateProfileResult,
  updateProfileAction,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: UpdateProfileResult | undefined = undefined;

export function PerfilForm({
  defaultFullName,
  defaultCrn,
}: {
  defaultFullName: string;
  defaultCrn: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initial);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="perfil-name">Nome completo</Label>
        <Input
          id="perfil-name"
          name="full_name"
          required
          defaultValue={defaultFullName}
          autoComplete="name"
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? "perfil-err" : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="perfil-crn">CRN</Label>
        <Input
          id="perfil-crn"
          name="crn"
          required
          defaultValue={defaultCrn}
          placeholder="Ex.: 12345"
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? "perfil-err" : undefined}
        />
        <p className="text-muted-foreground text-xs">
          Número de registo profissional usado em documentos gerados pelo sistema.
        </p>
      </div>

      {state?.ok === false ? (
        <p id="perfil-err" className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-muted-foreground text-sm" role="status">
          Perfil atualizado.
        </p>
      ) : null}

      <Button type="submit">Guardar perfil</Button>
    </form>
  );
}
