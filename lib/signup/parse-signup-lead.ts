import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/validators/br-document";
import { normalizeBrazilPhone } from "@/lib/validators/br-phone";
import type { SignupLeadInput, SignupLeadParsed } from "@/lib/signup/types";

export const SIGNUP_MIN_PASSWORD_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maiúscula + número + caractere especial (além do mínimo de caracteres). */
export function isSignupPasswordStrong(password: string): boolean {
  if (password.length < SIGNUP_MIN_PASSWORD_LENGTH) return false;
  if (!/[A-ZÀ-Ý]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9À-ÿ]/.test(password)) return false;
  return true;
}

export function signupPasswordPolicyMessage(): string {
  return `Mínimo de ${SIGNUP_MIN_PASSWORD_LENGTH} caracteres, com letra maiúscula, número e caractere especial.`;
}

export type SignupLeadField =
  | "fullName"
  | "email"
  | "phone"
  | "document"
  | "legalName"
  | "responsibleName"
  | "password"
  | "confirmPassword";

export type SignupLeadParseResult =
  | { ok: true; value: SignupLeadParsed }
  | { ok: false; errors: Partial<Record<SignupLeadField, string>> };

export function parseSignupLead(input: SignupLeadInput): SignupLeadParseResult {
  const errors: Partial<Record<SignupLeadField, string>> = {};
  const email = input.email.trim().toLowerCase();
  const phoneResult = normalizeBrazilPhone(input.phone);

  if (!email) errors.email = "Informe o e-mail.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Informe um e-mail válido.";

  if (!phoneResult.ok) errors.phone = phoneResult.error;
  else if (!phoneResult.value) errors.phone = "Informe o telefone.";

  if (!isSignupPasswordStrong(input.password)) {
    errors.password = signupPasswordPolicyMessage();
  }
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  let fullName: string | null = null;
  let legalName: string | null = null;
  let responsibleName: string | null = null;
  let documentKind: "cpf" | "cnpj" = "cpf";
  let documentId = "";

  if (input.personKind === "pf") {
    const name = input.fullName.trim();
    if (name.length < 2) errors.fullName = "Informe o nome completo.";
    else fullName = name;

    const cpf = onlyDigits(input.document);
    documentKind = "cpf";
    documentId = cpf;
    if (cpf.length !== 11) errors.document = "Informe o CPF com 11 dígitos.";
    else if (!isValidCpf(cpf)) errors.document = "CPF inválido. Confira os dígitos.";
  } else {
    const legal = input.legalName.trim();
    const responsible = input.responsibleName.trim();
    if (legal.length < 2) errors.legalName = "Informe a razão social.";
    else legalName = legal;
    if (responsible.length < 2) {
      errors.responsibleName = "Informe o nome do responsável.";
    } else responsibleName = responsible;

    const cnpj = onlyDigits(input.document);
    documentKind = "cnpj";
    documentId = cnpj;
    if (cnpj.length !== 14) errors.document = "Informe o CNPJ com 14 dígitos.";
    else if (!isValidCnpj(cnpj)) errors.document = "CNPJ inválido. Confira os dígitos.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      personKind: input.personKind,
      fullName,
      legalName,
      responsibleName,
      email,
      phone: phoneResult.ok && phoneResult.value ? phoneResult.value : "",
      documentKind,
      documentId,
      password: input.password,
    },
  };
}

export function displayNameFromLead(lead: Pick<
  SignupLeadParsed,
  "personKind" | "fullName" | "legalName" | "responsibleName"
>): string {
  if (lead.personKind === "pj") {
    return (lead.legalName ?? lead.responsibleName ?? "").trim();
  }
  return (lead.fullName ?? "").trim();
}
