import { describe, expect, it } from "vitest";

import {
  clientIpForInet,
  isLoopbackOrMissingIp,
  isValidIpCandidate,
  resolveApprovalClientIp,
  stripPortFromIp,
} from "@/lib/ip/client-ip-utils";

describe("client-ip-utils", () => {
  it("detecta loopback e valores ausentes", () => {
    expect(isLoopbackOrMissingIp("::1")).toBe(true);
    expect(isLoopbackOrMissingIp("127.0.0.1")).toBe(true);
    expect(isLoopbackOrMissingIp("desconhecido")).toBe(true);
    expect(isLoopbackOrMissingIp("203.0.113.10")).toBe(false);
  });

  it("valida IPv4 e IPv6 básicos", () => {
    expect(isValidIpCandidate("192.168.0.12")).toBe(true);
    expect(isValidIpCandidate("2001:db8::1")).toBe(true);
    expect(isValidIpCandidate("not-an-ip")).toBe(false);
    expect(isValidIpCandidate("999.999.999.999")).toBe(false);
  });

  it("prioriza headers em produção e IP do dispositivo em loopback", () => {
    const prodHeaders = new Headers({ "x-forwarded-for": "203.0.113.44" });
    expect(resolveApprovalClientIp(prodHeaders, "192.168.1.5")).toBe("203.0.113.44");

    const localHeaders = new Headers();
    expect(resolveApprovalClientIp(localHeaders, "187.45.12.90")).toBe("187.45.12.90");
    expect(resolveApprovalClientIp(localHeaders, null)).toBe("desconhecido");
  });
});

describe("stripPortFromIp — o IPv6 não pode ser mutilado", () => {
  it("remove a porta de IPv4", () => {
    expect(stripPortFromIp("201.43.104.66:443")).toBe("201.43.104.66");
    expect(stripPortFromIp("201.43.104.66")).toBe("201.43.104.66");
  });

  it("remove colchetes e porta de IPv6", () => {
    expect(stripPortFromIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(stripPortFromIp("[2001:db8::1]")).toBe("2001:db8::1");
  });

  it("NÃO mexe em IPv6 nu — era aqui que ::1 virava ':'", () => {
    expect(stripPortFromIp("::1")).toBe("::1");
    expect(stripPortFromIp("2001:db8::1")).toBe("2001:db8::1");
    expect(stripPortFromIp("2804:14d:1082:8000::10")).toBe("2804:14d:1082:8000::10");
    expect(stripPortFromIp("::ffff:127.0.0.1")).toBe("::ffff:127.0.0.1");
  });

  it("ignora espaços em volta", () => {
    expect(stripPortFromIp("  203.0.113.9  ")).toBe("203.0.113.9");
  });
});

describe("clientIpForInet — valor seguro para coluna inet", () => {
  const h = (obj: Record<string, string>) => new Headers(obj);

  it("devolve o IPv4 do x-forwarded-for, sem porta", () => {
    expect(clientIpForInet(h({ "x-forwarded-for": "203.0.113.44:51234" }))).toBe("203.0.113.44");
  });

  it("usa só a primeira entrada da cadeia de proxies", () => {
    expect(
      clientIpForInet(h({ "x-forwarded-for": "203.0.113.44, 70.41.3.18, 150.172.238.178" })),
    ).toBe("203.0.113.44");
  });

  it("preserva IPv6", () => {
    expect(clientIpForInet(h({ "x-forwarded-for": "2804:14d:1082:8000::10" }))).toBe(
      "2804:14d:1082:8000::10",
    );
    expect(clientIpForInet(h({ "x-forwarded-for": "::1" }))).toBe("::1");
  });

  it("cai para cf-connecting-ip e x-real-ip", () => {
    expect(clientIpForInet(h({ "cf-connecting-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIpForInet(h({ "x-real-ip": "198.51.100.8" }))).toBe("198.51.100.8");
  });

  it("sem header algum devolve null — nunca 'desconhecido'", () => {
    expect(clientIpForInet(h({}))).toBeNull();
  });

  it("valor inválido devolve null em vez de estourar o INSERT", () => {
    expect(clientIpForInet(h({ "x-forwarded-for": "not-an-ip" }))).toBeNull();
    expect(clientIpForInet(h({ "x-forwarded-for": "999.999.999.999" }))).toBeNull();
  });
});
