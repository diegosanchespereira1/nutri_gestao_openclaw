"use client";

import { useActionState, useState, type FormEvent } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CreateTeamMemberResult,
  createTeamMemberAction,
  updateTeamMemberAction,
} from "@/lib/actions/team-members";
import { TEAM_JOB_ROLES, teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { ProfessionalArea, TeamMemberRow } from "@/lib/types/team-members";
import { cn } from "@/lib/utils";

// Dentro do Card (bg-card = branco), select e textarea usam bg-card para consistência
const selectClassName =
  "border-input bg-card text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const textareaClass =
  "border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type Props = {
  mode: "create" | "edit";
  initial?: TeamMemberRow | null;
};

const initialCreateState: CreateTeamMemberResult | undefined = undefined;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasSpecialCharRegex = /[^A-Za-z0-9]/;

type CreateFieldName =
  | "full_name"
  | "email"
  | "password"
  | "confirm_password"
  | "professional_area"
  | "job_role"
  | "crn";

type CreateFieldErrors = Partial<Record<CreateFieldName, string>>;

export function TeamMemberForm({ mode, initial }: Props) {
  const [area, setArea] = useState<ProfessionalArea>(
    initial?.professional_area ?? "nutrition",
  );
  const isCreate = mode === "create";
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [fullNameValue, setFullNameValue] = useState(initial?.full_name ?? "");
  const [emailValue, setEmailValue] = useState(initial?.email ?? "");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [jobRoleValue, setJobRoleValue] = useState(initial?.job_role ?? "nutricionista");
  const [crnValue, setCrnValue] = useState(initial?.crn ?? "");
  const [fieldErrors, setFieldErrors] = useState<CreateFieldErrors>({});
  const [createState, createFormAction] = useActionState(
    createTeamMemberAction,
    initialCreateState,
  );

  const action = updateTeamMemberAction;

  function shouldShowFieldError(field: CreateFieldName): boolean {
    if (attemptedSubmit) return true;
    if (field === "password") return passwordValue.length > 0;
    if (field === "confirm_password") {
      return confirmPasswordValue.length > 0 || passwordValue.length > 0;
    }
    return false;
  }

  function validateCreateFields(values: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    professionalArea: ProfessionalArea;
    jobRole: string;
    crn: string;
  }): CreateFieldErrors {
    const errors: CreateFieldErrors = {};
    const fullNameTrimmed = values.fullName.trim();
    const emailTrimmed = values.email.trim();
    const crnTrimmed = values.crn.trim();

    if (fullNameTrimmed.length < 2) {
      errors.full_name = "Informe o nome completo (mínimo 2 caracteres).";
    }
    if (!emailTrimmed) {
      errors.email = "Informe o e-mail.";
    } else if (!emailRegex.test(emailTrimmed)) {
      errors.email = "Informe um e-mail válido.";
    }

    if (!values.password) {
      errors.password = "Informe a senha.";
    } else if (values.password.length < 6) {
      errors.password = "A senha deve ter no mínimo 6 caracteres.";
    } else if (!hasSpecialCharRegex.test(values.password)) {
      errors.password = "A senha deve ter pelo menos 1 caractere especial.";
    }

    if (!values.confirmPassword) {
      errors.confirm_password = "Confirme a senha.";
    } else if (values.confirmPassword !== values.password) {
      errors.confirm_password = "As senhas não coincidem.";
    }

    if (!values.professionalArea) {
      errors.professional_area = "Selecione a área profissional.";
    }

    if (!values.jobRole) {
      errors.job_role = "Selecione o perfil/cargo.";
    }

    if (values.professionalArea === "nutrition" && !crnTrimmed) {
      errors.crn = "CRN obrigatório para área de Nutrição.";
    }

    return errors;
  }

  function runCreateValidation(next?: Partial<{
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    professionalArea: ProfessionalArea;
    jobRole: string;
    crn: string;
  }>): CreateFieldErrors {
    const errors = validateCreateFields({
      fullName: next?.fullName ?? fullNameValue,
      email: next?.email ?? emailValue,
      password: next?.password ?? passwordValue,
      confirmPassword: next?.confirmPassword ?? confirmPasswordValue,
      professionalArea: next?.professionalArea ?? area,
      jobRole: next?.jobRole ?? jobRoleValue,
      crn: next?.crn ?? crnValue,
    });
    setFieldErrors(errors);
    return errors;
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    setAttemptedSubmit(true);
    const errors = runCreateValidation();
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={isCreate ? createFormAction : action}
      className="max-w-lg space-y-6"
      onSubmit={isCreate ? handleCreateSubmit : undefined}
    >
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {isCreate && createState?.ok === false ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p>{createState.error}</p>
          {createState.reason ? (
            <p className="mt-1 text-xs opacity-90">{createState.reason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="tm-name">Nome completo</Label>
        <Input
          id="tm-name"
          name="full_name"
          required
          minLength={2}
          value={isCreate ? fullNameValue : undefined}
          defaultValue={isCreate ? undefined : initial?.full_name ?? ""}
          onChange={
            isCreate
              ? (event) => {
                  const value = event.target.value;
                  setFullNameValue(value);
                  if (attemptedSubmit) {
                    runCreateValidation({ fullName: value });
                  }
                }
              : undefined
          }
          autoComplete="name"
          className={cn(
            isCreate &&
              shouldShowFieldError("full_name") &&
              fieldErrors.full_name &&
              "border-destructive ring-destructive/20",
          )}
          aria-invalid={
            isCreate
              ? shouldShowFieldError("full_name") && Boolean(fieldErrors.full_name)
              : undefined
          }
        />
        {isCreate && shouldShowFieldError("full_name") && fieldErrors.full_name ? (
          <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tm-email">{isCreate ? "Email" : "Email (opcional)"}</Label>
        <Input
          id="tm-email"
          name="email"
          type="email"
          value={isCreate ? emailValue : undefined}
          defaultValue={isCreate ? undefined : initial?.email ?? ""}
          onChange={
            isCreate
              ? (event) => {
                  const value = event.target.value;
                  setEmailValue(value);
                  if (attemptedSubmit) {
                    runCreateValidation({ email: value });
                  }
                }
              : undefined
          }
          autoComplete="email"
          required={isCreate}
          className={cn(
            isCreate &&
              shouldShowFieldError("email") &&
              fieldErrors.email &&
              "border-destructive ring-destructive/20",
          )}
          aria-invalid={
            isCreate
              ? shouldShowFieldError("email") && Boolean(fieldErrors.email)
              : undefined
          }
        />
        {isCreate && shouldShowFieldError("email") && fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      {isCreate ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="tm-password">Senha</Label>
            <PasswordField
              id="tm-password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={passwordValue}
              onChange={(event) => {
                const value = event.target.value;
                setPasswordValue(value);
                // Validação em tempo real das senhas durante preenchimento.
                runCreateValidation({ password: value });
              }}
              className={cn(
                shouldShowFieldError("password") &&
                  fieldErrors.password &&
                  "border-destructive ring-destructive/20",
              )}
              aria-invalid={
                shouldShowFieldError("password") && Boolean(fieldErrors.password)
              }
            />
            <p className="text-xs text-muted-foreground">
              Use no mínimo 6 caracteres e pelo menos 1 caractere especial.
            </p>
            {shouldShowFieldError("password") && fieldErrors.password ? (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm-password-confirm">Confirmar senha</Label>
            <PasswordField
              id="tm-password-confirm"
              name="confirm_password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPasswordValue}
              onChange={(event) => {
                const value = event.target.value;
                setConfirmPasswordValue(value);
                runCreateValidation({ confirmPassword: value });
              }}
              className={cn(
                shouldShowFieldError("confirm_password") &&
                  fieldErrors.confirm_password &&
                  "border-destructive ring-destructive/20",
              )}
              aria-invalid={
                shouldShowFieldError("confirm_password") &&
                Boolean(fieldErrors.confirm_password)
              }
            />
            {shouldShowFieldError("confirm_password") && fieldErrors.confirm_password ? (
              <p className="text-xs text-destructive">
                {fieldErrors.confirm_password}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

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
              onChange={() => {
                setArea("nutrition");
                if (isCreate && attemptedSubmit) {
                  runCreateValidation({ professionalArea: "nutrition" });
                }
              }}
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
              onChange={() => {
                setArea("other");
                if (isCreate) {
                  setCrnValue("");
                  if (attemptedSubmit) {
                    runCreateValidation({ professionalArea: "other", crn: "" });
                  }
                }
              }}
              required
              className="h-4 w-4"
            />
            Outra área
          </label>
        </div>
        {isCreate &&
        shouldShowFieldError("professional_area") &&
        fieldErrors.professional_area ? (
          <p className="text-xs text-destructive">{fieldErrors.professional_area}</p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="tm-role">Perfil / cargo</Label>
        <select
          id="tm-role"
          name="job_role"
          className={cn(
            selectClassName,
            isCreate &&
              shouldShowFieldError("job_role") &&
              fieldErrors.job_role &&
              "border-destructive ring-destructive/20",
          )}
          required
          defaultValue={initial?.job_role ?? "nutricionista"}
          value={isCreate ? jobRoleValue : undefined}
          onChange={
            isCreate
              ? (event) => {
                  const value = event.target.value as TeamMemberRow["job_role"];
                  setJobRoleValue(value);
                  if (attemptedSubmit) {
                    runCreateValidation({ jobRole: value });
                  }
                }
              : undefined
          }
          aria-invalid={
            isCreate
              ? shouldShowFieldError("job_role") && Boolean(fieldErrors.job_role)
              : undefined
          }
        >
          {TEAM_JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {teamJobRoleLabel[r]}
            </option>
          ))}
        </select>
        {isCreate && shouldShowFieldError("job_role") && fieldErrors.job_role ? (
          <p className="text-xs text-destructive">{fieldErrors.job_role}</p>
        ) : null}
      </div>

      {area === "nutrition" ? (
        <div className="space-y-2">
          <Label htmlFor="tm-crn">CRN (obrigatório na nutrição)</Label>
          <Input
            id="tm-crn"
            name="crn"
            required={area === "nutrition"}
            defaultValue={isCreate ? undefined : initial?.crn ?? ""}
            value={isCreate ? crnValue : undefined}
            onChange={
              isCreate
                ? (event) => {
                    const value = event.target.value;
                    setCrnValue(value);
                    if (attemptedSubmit) {
                      runCreateValidation({ crn: value });
                    }
                  }
                : undefined
            }
            autoComplete="off"
            className={cn(
              isCreate &&
                shouldShowFieldError("crn") &&
                fieldErrors.crn &&
                "border-destructive ring-destructive/20",
            )}
            aria-invalid={
              isCreate
                ? shouldShowFieldError("crn") && Boolean(fieldErrors.crn)
                : undefined
            }
          />
          {isCreate && shouldShowFieldError("crn") && fieldErrors.crn ? (
            <p className="text-xs text-destructive">{fieldErrors.crn}</p>
          ) : null}
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
        {mode === "create" ? "Criar conta e vincular" : "Salvar alterações"}
      </Button>
    </form>
  );
}
