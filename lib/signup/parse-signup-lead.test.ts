import { describe, expect, it } from "vitest";

import { parseSignupLead, displayNameFromLead } from "@/lib/signup/parse-signup-lead";
import type { SignupLeadInput } from "@/lib/signup/types";

const validPf = (): SignupLeadInput => ({
  personKind: "pf",
  fullName: "Maria Silva",
  legalName: "",
  responsibleName: "",
  email: "maria@example.com",
  phone: "(11) 98888-7777",
  document: "529.982.247-25",
  password: "SenhaForte!123",
  confirmPassword: "SenhaForte!123",
});

describe("parseSignupLead", () => {
  it("aceita PF válida", () => {
    const parsed = parseSignupLead(validPf());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.email).toBe("maria@example.com");
    expect(parsed.value.documentKind).toBe("cpf");
    expect(parsed.value.documentId).toBe("52998224725");
  });

  it("rejeita senha curta e confirmação diferente", () => {
    const parsed = parseSignupLead({
      ...validPf(),
      password: "curta",
      confirmPassword: "outra",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.password).toBeDefined();
    expect(parsed.errors.confirmPassword).toBeDefined();
  });

  it("aceita senha com 6 caracteres forte (maiúscula, número e especial)", () => {
    const parsed = parseSignupLead({
      ...validPf(),
      password: "Ab1@cd",
      confirmPassword: "Ab1@cd",
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejeita senha longa sem maiúscula/número/especial", () => {
    const parsed = parseSignupLead({
      ...validPf(),
      password: "senhasemforca",
      confirmPassword: "senhasemforca",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.password).toMatch(/maiúscula/i);
  });

  it("aceita PJ com CNPJ válido", () => {
    const parsed = parseSignupLead({
      personKind: "pj",
      fullName: "",
      legalName: "Clínica Nutri LTDA",
      responsibleName: "João Responsável",
      email: "contato@clinica.com",
      phone: "1133334444",
      document: "11.222.333/0001-81",
      password: "SenhaForte!123",
      confirmPassword: "SenhaForte!123",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.documentKind).toBe("cnpj");
    expect(displayNameFromLead(parsed.value)).toBe("Clínica Nutri LTDA");
  });
});
