import { describe, expect, it } from "vitest";

import {
  formatBrDocument,
  formatCnpjDisplay,
  formatCpfDisplay,
  maskBrDocumentInput,
} from "@/lib/format/br-document";

describe("formatCpfDisplay", () => {
  it("formata 11 dígitos", () => {
    expect(formatCpfDisplay("52998224725")).toBe("529.982.247-25");
  });

  it("devolve original se tamanho inválido", () => {
    expect(formatCpfDisplay("123")).toBe("123");
  });
});

describe("formatCnpjDisplay", () => {
  it("formata 14 dígitos", () => {
    expect(formatCnpjDisplay("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("devolve original se tamanho inválido", () => {
    expect(formatCnpjDisplay("abc")).toBe("abc");
  });
});

describe("formatBrDocument", () => {
  it("formata pelo tamanho: 11 dígitos = CPF, 14 = CNPJ", () => {
    expect(formatBrDocument("52998224725")).toBe("529.982.247-25");
    expect(formatBrDocument("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("aceita entrada já mascarada", () => {
    expect(formatBrDocument("529.982.247-25")).toBe("529.982.247-25");
  });

  it("tamanho inesperado volta só com os dígitos", () => {
    expect(formatBrDocument("123")).toBe("123");
  });

  it("null e vazio viram string vazia", () => {
    expect(formatBrDocument(null)).toBe("");
    expect(formatBrDocument(undefined)).toBe("");
    expect(formatBrDocument("")).toBe("");
  });
});

describe("maskBrDocumentInput", () => {
  it("aplica máscara progressiva de CPF", () => {
    expect(maskBrDocumentInput("cpf", "529")).toBe("529");
    expect(maskBrDocumentInput("cpf", "5299")).toBe("529.9");
    expect(maskBrDocumentInput("cpf", "529982247")).toBe("529.982.247");
    expect(maskBrDocumentInput("cpf", "52998224725")).toBe("529.982.247-25");
  });

  it("aplica máscara progressiva de CNPJ", () => {
    expect(maskBrDocumentInput("cnpj", "11")).toBe("11");
    expect(maskBrDocumentInput("cnpj", "112")).toBe("11.2");
    expect(maskBrDocumentInput("cnpj", "11222333")).toBe("11.222.333");
    expect(maskBrDocumentInput("cnpj", "112223330001")).toBe("11.222.333/0001");
    expect(maskBrDocumentInput("cnpj", "11222333000181")).toBe(
      "11.222.333/0001-81",
    );
  });

  it("corta dígitos além do tamanho do tipo", () => {
    expect(maskBrDocumentInput("cpf", "529982247259999")).toBe("529.982.247-25");
    expect(maskBrDocumentInput("cnpj", "112223330001819999")).toBe(
      "11.222.333/0001-81",
    );
  });

  it("sem tipo, decide pelo tamanho", () => {
    expect(maskBrDocumentInput(null, "52998224725")).toBe("529.982.247-25");
    expect(maskBrDocumentInput(null, "11222333000181")).toBe(
      "11.222.333/0001-81",
    );
  });

  it("ignora o que não é dígito e devolve vazio para entrada vazia", () => {
    expect(maskBrDocumentInput("cpf", "abc")).toBe("");
    expect(maskBrDocumentInput("cpf", "")).toBe("");
    expect(maskBrDocumentInput("cnpj", "11.222")).toBe("11.222");
  });
});
