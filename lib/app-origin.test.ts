import { afterEach, describe, expect, it } from "vitest";

import { getServerAppOrigin } from "@/lib/app-origin";

const CHAVES = ["SITE_URL", "NEXT_PUBLIC_SITE_URL", "VERCEL_URL"] as const;
const original = Object.fromEntries(CHAVES.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of CHAVES) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

function limpar() {
  for (const k of CHAVES) delete process.env[k];
}

describe("getServerAppOrigin", () => {
  it("usa SITE_URL do runtime antes de tudo", () => {
    limpar();
    process.env.SITE_URL = "https://dev-nutricao.nutrigestao.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://embutido-no-build.example";
    expect(getServerAppOrigin()).toBe("https://dev-nutricao.nutrigestao.app");
  });

  it("usa NEXT_PUBLIC_SITE_URL quando SITE_URL não existe", () => {
    limpar();
    process.env.NEXT_PUBLIC_SITE_URL = "https://dev-nutricao.nutrigestao.app";
    expect(getServerAppOrigin()).toBe("https://dev-nutricao.nutrigestao.app");
  });

  it("remove a barra final", () => {
    limpar();
    process.env.SITE_URL = "https://dev-nutricao.nutrigestao.app/";
    expect(getServerAppOrigin()).toBe("https://dev-nutricao.nutrigestao.app");
  });

  it("ignora valor vazio ou só com espaços", () => {
    limpar();
    process.env.SITE_URL = "   ";
    process.env.NEXT_PUBLIC_SITE_URL = "";
    process.env.VERCEL_URL = "app.vercel.app";
    expect(getServerAppOrigin()).toBe("https://app.vercel.app");
  });

  it("cai em localhost só quando não há nada — o caso que gerava success_url errada", () => {
    limpar();
    expect(getServerAppOrigin()).toBe("http://localhost:3000");
  });
});
