import { describe, expect, it } from "vitest";

import {
  isLoopbackOrMissingIp,
  isValidIpCandidate,
  resolveApprovalClientIp,
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
