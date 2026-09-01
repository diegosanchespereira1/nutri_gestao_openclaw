import { describe, expect, it } from "vitest";

import {
  TENANT_DOCUMENT_MEMBER_MESSAGE,
  TENANT_DOCUMENT_TAKEN_MESSAGE,
  mapTenantDocumentDbError,
  parseTenantDocument,
  parseTenantDocumentKind,
  tenantDocumentChanged,
  tenantDocumentLabel,
} from "./tenant-document";

// CPF e CNPJ válidos (dígitos verificadores corretos).
const CPF_OK = "52998224725";
const CNPJ_OK = "11222333000181";

describe("parseTenantDocumentKind", () => {
  it("aceita apenas cpf e cnpj", () => {
    expect(parseTenantDocumentKind("cpf")).toBe("cpf");
    expect(parseTenantDocumentKind("cnpj")).toBe("cnpj");
    expect(parseTenantDocumentKind("rg")).toBeNull();
    expect(parseTenantDocumentKind(null)).toBeNull();
    expect(parseTenantDocumentKind(undefined)).toBeNull();
  });
});

describe("parseTenantDocument", () => {
  it("aceita CPF válido com máscara e guarda só dígitos", () => {
    const r = parseTenantDocument("cpf", "529.982.247-25", { required: true });
    expect(r).toEqual({
      ok: true,
      value: { document_kind: "cpf", document_id: CPF_OK },
    });
  });

  it("aceita CNPJ válido com máscara", () => {
    const r = parseTenantDocument("cnpj", "11.222.333/0001-81", {
      required: true,
    });
    expect(r).toEqual({
      ok: true,
      value: { document_kind: "cnpj", document_id: CNPJ_OK },
    });
  });

  it("deduz o tipo pelo tamanho quando o campo não veio", () => {
    expect(parseTenantDocument(null, CPF_OK, { required: true })).toEqual({
      ok: true,
      value: { document_kind: "cpf", document_id: CPF_OK },
    });
    expect(parseTenantDocument(null, CNPJ_OK, { required: true })).toEqual({
      ok: true,
      value: { document_kind: "cnpj", document_id: CNPJ_OK },
    });
  });

  it("em branco é erro quando obrigatório", () => {
    const r = parseTenantDocument("cpf", "   ", { required: true });
    expect(r).toEqual({ ok: false, error: "Informe o CPF ou o CNPJ da conta." });
  });

  it("em branco devolve par nulo quando opcional — tenant antigo sem documento", () => {
    expect(parseTenantDocument("", "", { required: false })).toEqual({
      ok: true,
      value: { document_kind: null, document_id: null },
    });
  });

  it("documento com tamanho estranho e sem tipo pede o tipo", () => {
    const r = parseTenantDocument(null, "12345", { required: true });
    expect(r).toEqual({
      ok: false,
      error: "Selecione se o documento é CPF ou CNPJ.",
    });
  });

  it("rejeita CPF com tamanho errado", () => {
    expect(parseTenantDocument("cpf", "5299822472", { required: true })).toEqual({
      ok: false,
      error: "O CPF deve ter 11 dígitos.",
    });
  });

  it("rejeita CNPJ com tamanho errado", () => {
    expect(
      parseTenantDocument("cnpj", "1122233300018", { required: true }),
    ).toEqual({ ok: false, error: "O CNPJ deve ter 14 dígitos." });
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(parseTenantDocument("cpf", "52998224724", { required: true })).toEqual({
      ok: false,
      error: "CPF inválido. Confira os dígitos.",
    });
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(
      parseTenantDocument("cnpj", "11222333000182", { required: true }),
    ).toEqual({ ok: false, error: "CNPJ inválido. Confira os dígitos." });
  });

  it("rejeita sequências repetidas", () => {
    expect(parseTenantDocument("cpf", "11111111111", { required: true })).toEqual({
      ok: false,
      error: "CPF inválido. Confira os dígitos.",
    });
  });

  it("o tipo declarado manda sobre o tamanho — CNPJ de 11 dígitos falha", () => {
    expect(parseTenantDocument("cnpj", CPF_OK, { required: true })).toEqual({
      ok: false,
      error: "O CNPJ deve ter 14 dígitos.",
    });
  });
});

describe("tenantDocumentLabel", () => {
  it("formata CPF e CNPJ com prefixo", () => {
    expect(
      tenantDocumentLabel({ document_kind: "cpf", document_id: CPF_OK }),
    ).toBe("CPF 529.982.247-25");
    expect(
      tenantDocumentLabel({ document_kind: "cnpj", document_id: CNPJ_OK }),
    ).toBe("CNPJ 11.222.333/0001-81");
  });

  it("sem documento diz que não foi informado", () => {
    expect(
      tenantDocumentLabel({ document_kind: null, document_id: null }),
    ).toBe("Não informado");
  });
});

describe("tenantDocumentChanged", () => {
  it("detecta troca de número e de tipo", () => {
    expect(
      tenantDocumentChanged(
        { document_kind: "cpf", document_id: CPF_OK },
        { document_kind: "cnpj", document_id: CNPJ_OK },
      ),
    ).toBe(true);
    expect(
      tenantDocumentChanged(
        { document_kind: null, document_id: null },
        { document_kind: "cpf", document_id: CPF_OK },
      ),
    ).toBe(true);
  });

  it("não acusa mudança quando é o mesmo documento", () => {
    expect(
      tenantDocumentChanged(
        { document_kind: "cpf", document_id: CPF_OK },
        { document_kind: "cpf", document_id: CPF_OK },
      ),
    ).toBe(false);
    expect(
      tenantDocumentChanged(
        { document_kind: null, document_id: null },
        { document_kind: null, document_id: null },
      ),
    ).toBe(false);
  });
});

describe("mapTenantDocumentDbError", () => {
  it("traduz a violação do índice único global", () => {
    expect(
      mapTenantDocumentDbError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_document_id_uidx"',
      }),
    ).toBe(TENANT_DOCUMENT_TAKEN_MESSAGE);
  });

  it("traduz o bloqueio de membro de equipe", () => {
    expect(
      mapTenantDocumentDbError({
        code: "P0001",
        message: "DOCUMENTO_SOMENTE_TITULAR: membro de equipe não é tenant",
      }),
    ).toBe(TENANT_DOCUMENT_MEMBER_MESSAGE);
  });

  it("traduz o check de par incompleto", () => {
    expect(
      mapTenantDocumentDbError({
        code: "23514",
        message: 'violates check constraint "profiles_document_pair_check"',
      }),
    ).toBe("Documento incompleto: informe o tipo e o número.");
  });

  it("devolve null para erro alheio e para null", () => {
    expect(
      mapTenantDocumentDbError({ code: "23505", message: "outra_constraint" }),
    ).toBeNull();
    expect(mapTenantDocumentDbError(null)).toBeNull();
  });
});
