import { describe, expect, it } from "vitest";

import {
  hasSpecialCharacter,
  mapCreateAuthErrorReason,
  mapCreateAuthErrorToParam,
  parseProfessionalArea,
} from "./parse-team-member-fields";

describe("parseProfessionalArea", () => {
  it("aceita as duas áreas válidas", () => {
    expect(parseProfessionalArea("nutrition")).toBe("nutrition");
    expect(parseProfessionalArea("other")).toBe("other");
  });

  it("rejeita o resto", () => {
    for (const v of ["", "Nutrition", "nutricao", null, undefined, 1]) {
      expect(parseProfessionalArea(v)).toBeNull();
    }
  });
});

describe("hasSpecialCharacter", () => {
  it("exige ao menos um caractere não alfanumérico", () => {
    expect(hasSpecialCharacter("SenhaForte1")).toBe(false);
    expect(hasSpecialCharacter("SenhaForte1!")).toBe(true);
  });

  it("espaço e acento contam como especial", () => {
    expect(hasSpecialCharacter("senha forte")).toBe(true);
    expect(hasSpecialCharacter("senhaforté")).toBe(true);
  });

  it("string vazia não tem especial", () => {
    expect(hasSpecialCharacter("")).toBe(false);
  });
});

describe("mapCreateAuthErrorToParam", () => {
  it("detecta e-mail duplicado nas várias redações do GoTrue", () => {
    for (const m of [
      "User already registered",
      "A user with this email address has already been registered",
      "Email exists",
    ]) {
      expect(mapCreateAuthErrorToParam(m)).toBe("email_exists");
    }
  });

  it("detecta senha fraca", () => {
    for (const m of [
      "Password should be at least 6 characters",
      "password too short",
      "Password is too weak",
      "Password must contain a special character",
    ]) {
      expect(mapCreateAuthErrorToParam(m)).toBe("password_policy");
    }
  });

  it("detecta e-mail inválido", () => {
    expect(mapCreateAuthErrorToParam("Unable to validate email address: invalid format")).toBe(
      "email_invalid",
    );
  });

  it("cai no genérico quando não reconhece", () => {
    expect(mapCreateAuthErrorToParam("database connection lost")).toBe("auth_create");
  });

  it("é insensível a maiúsculas", () => {
    expect(mapCreateAuthErrorToParam("USER ALREADY REGISTERED")).toBe("email_exists");
  });
});

describe("mapCreateAuthErrorReason", () => {
  it("traduz para pt-BR", () => {
    expect(mapCreateAuthErrorReason("User already registered")).toBe(
      "Esse e-mail já está cadastrado.",
    );
    expect(mapCreateAuthErrorReason("invalid email format")).toBe(
      "O e-mail informado é inválido.",
    );
    expect(mapCreateAuthErrorReason("password needs a special character")).toBe(
      "A senha precisa conter pelo menos 1 caractere especial.",
    );
    expect(mapCreateAuthErrorReason("password too short")).toBe(
      "A senha informada é muito curta.",
    );
  });

  it("tem fallback para erro desconhecido", () => {
    expect(mapCreateAuthErrorReason("boom")).toBe(
      "Não foi possível validar os dados junto ao serviço de autenticação.",
    );
  });
});
