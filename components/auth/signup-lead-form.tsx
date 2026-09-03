"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/password-field";
import { maskBrDocumentInput } from "@/lib/format/br-document";
import {
  parseSignupLead,
  signupPasswordPolicyMessage,
  type SignupLeadField,
} from "@/lib/signup/parse-signup-lead";
import { signupStepperNextLabel } from "@/lib/signup/format-plan-price";
import type { SignupLeadInput, SignupPersonKind } from "@/lib/signup/types";
import { cn } from "@/lib/utils";
import {
  FIELD_ERROR_RING,
  FieldErrorTooltip,
} from "@/components/auth/field-error-tooltip";
import {
  formatBrazilPhoneInput,
} from "@/lib/validators/br-phone";

type Props = {
  value: SignupLeadInput;
  onChange: (next: SignupLeadInput) => void;
  onContinue: () => void;
  /** Consulta de disponibilidade em curso: evita duplo envio. */
  busy?: boolean;
  /** Erro vindo do servidor (e-mail ou documento já em uso), ancorado ao campo. */
  fieldError?: { field: "email" | "document"; message: string } | null;
};

export function SignupLeadStep({
  value,
  onChange,
  onContinue,
  busy,
  fieldError,
}: Props) {
  const [showErrors, setShowErrors] = useState(false);
  const errors = peekErrors(value);

  function patch(partial: Partial<SignupLeadInput>) {
    onChange({ ...value, ...partial });
  }

  function switchKind(personKind: SignupPersonKind) {
    onChange({
      ...value,
      personKind,
      document: "",
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseSignupLead(value);
    if (!parsed.ok) {
      setShowErrors(true);
      return;
    }
    onContinue();
  }

  // O erro do servidor aparece mesmo antes do primeiro envio falhado, porque ele
  // só existe depois de um envio.
  const shown: Partial<Record<SignupLeadField, string>> = {
    ...(showErrors ? errors : {}),
    ...(fieldError ? { [fieldError.field]: fieldError.message } : {}),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-muted-foreground text-sm">
        Preencha seus dados. O e-mail só é confirmado depois do pagamento (ou
        após criar a conta no plano gratuito).
      </p>

      <fieldset className="space-y-3">
        <legend className="text-foreground text-sm font-medium">Tipo de cadastro</legend>
        <div
          role="radiogroup"
          aria-label="Pessoa Física ou Pessoa Jurídica"
          className="flex flex-wrap gap-4"
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="person_kind"
              value="pf"
              checked={value.personKind === "pf"}
              onChange={() => switchKind("pf")}
              className="accent-primary size-4"
            />
            Pessoa Física
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="person_kind"
              value="pj"
              checked={value.personKind === "pj"}
              onChange={() => switchKind("pj")}
              className="accent-primary size-4"
            />
            Pessoa Jurídica
          </label>
        </div>
      </fieldset>

      {value.personKind === "pf" ? (
        <>
          <TextField
            id="signup-name"
            label="Nome"
            name="full_name"
            autoComplete="name"
            value={value.fullName}
            error={shown.fullName}
            onChange={(fullName) => patch({ fullName })}
          />
          <EmailField
            value={value.email}
            error={shown.email}
            onChange={(email) => patch({ email })}
          />
          <PhoneField
            value={value.phone}
            error={shown.phone}
            onChange={(phone) => patch({ phone })}
          />
          <DocumentField
            kind="cpf"
            value={value.document}
            error={shown.document}
            onChange={(document) => patch({ document })}
          />
        </>
      ) : (
        <>
          <TextField
            id="signup-legal-name"
            label="Razão social"
            name="legal_name"
            autoComplete="organization"
            value={value.legalName}
            error={shown.legalName}
            onChange={(legalName) => patch({ legalName })}
          />
          <EmailField
            value={value.email}
            error={shown.email}
            onChange={(email) => patch({ email })}
          />
          <DocumentField
            kind="cnpj"
            value={value.document}
            error={shown.document}
            onChange={(document) => patch({ document })}
          />
          <PhoneField
            value={value.phone}
            error={shown.phone}
            onChange={(phone) => patch({ phone })}
          />
          <TextField
            id="signup-responsible"
            label="Nome do responsável"
            name="responsible_name"
            autoComplete="name"
            value={value.responsibleName}
            error={shown.responsibleName}
            onChange={(responsibleName) => patch({ responsibleName })}
          />
        </>
      )}

      <div className="relative space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <PasswordField
          id="signup-password"
          name="password"
          autoComplete="new-password"
          required
          value={value.password}
          onChange={(ev) => patch({ password: ev.target.value })}
          className={cn(shown.password && FIELD_ERROR_RING)}
          aria-invalid={Boolean(shown.password)}
          aria-describedby={shown.password ? "signup-password-error" : undefined}
        />
        {shown.password ? (
          <FieldErrorTooltip id="signup-password-error" message={shown.password} />
        ) : (
          <p className="text-muted-foreground text-xs">
            {signupPasswordPolicyMessage()}
          </p>
        )}
      </div>

      <div className="relative space-y-2">
        <Label htmlFor="signup-password-confirm">Confirmar senha</Label>
        <PasswordField
          id="signup-password-confirm"
          name="confirm_password"
          autoComplete="new-password"
          required
          value={value.confirmPassword}
          onChange={(ev) => patch({ confirmPassword: ev.target.value })}
          className={cn(shown.confirmPassword && FIELD_ERROR_RING)}
          aria-invalid={Boolean(shown.confirmPassword)}
          aria-describedby={
            shown.confirmPassword ? "signup-password-confirm-error" : undefined
          }
        />
        {shown.confirmPassword ? (
          <FieldErrorTooltip
            id="signup-password-confirm-error"
            message={shown.confirmPassword}
          />
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Verificando…" : signupStepperNextLabel(1)}
      </Button>
    </form>
  );
}

function peekErrors(value: SignupLeadInput): Partial<Record<SignupLeadField, string>> {
  const parsed = parseSignupLead(value);
  return parsed.ok ? {} : parsed.errors;
}

function TextField({
  id,
  label,
  name,
  autoComplete,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className={cn(error && FIELD_ERROR_RING)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <FieldErrorTooltip id={`${id}-error`} message={error} />
      ) : null}
    </div>
  );
}

function EmailField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative space-y-2">
      <Label htmlFor="signup-email">Email</Label>
      <Input
        id="signup-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className={cn(error && FIELD_ERROR_RING)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "signup-email-error" : undefined}
      />
      {error ? (
        <FieldErrorTooltip id="signup-email-error" message={error} />
      ) : null}
    </div>
  );
}

function PhoneField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative space-y-2">
      <Label htmlFor="signup-phone">Telefone</Label>
      <Input
        id="signup-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={value}
        onChange={(ev) => onChange(formatBrazilPhoneInput(ev.target.value))}
        className={cn(error && FIELD_ERROR_RING)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "signup-phone-error" : undefined}
      />
      {error ? (
        <FieldErrorTooltip id="signup-phone-error" message={error} />
      ) : null}
    </div>
  );
}

function DocumentField({
  kind,
  value,
  error,
  onChange,
}: {
  kind: "cpf" | "cnpj";
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = kind === "cpf" ? "CPF" : "CNPJ";
  return (
    <div className="relative space-y-2">
      <Label htmlFor="signup-document">{label}</Label>
      <Input
        id="signup-document"
        name="document"
        inputMode="numeric"
        autoComplete="off"
        required
        value={value}
        onChange={(ev) => onChange(maskBrDocumentInput(kind, ev.target.value))}
        className={cn(error && FIELD_ERROR_RING)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "signup-document-error" : undefined}
      />
      {error ? (
        <FieldErrorTooltip id="signup-document-error" message={error} />
      ) : null}
    </div>
  );
}
