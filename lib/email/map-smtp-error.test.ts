import { describe, expect, it } from "vitest";

import { mapSmtpError } from "@/lib/email/map-smtp-error";

describe("mapSmtpError", () => {
  it("mapeia credenciais Gmail inválidas (535)", () => {
    const mapped = mapSmtpError(
      new Error(
        "Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to 535 5.7.8 https://support.google.com/mail/?p=BadCredentials",
      ),
    );
    expect(mapped.code).toBe("SMTP-AUTH-001");
    expect(mapped.message).toContain("SMTP-AUTH-001");
    expect(mapped.message).not.toMatch(/Invalid login|BadCredentials/i);
  });

  it("mapeia falha de ligação", () => {
    const mapped = mapSmtpError(new Error("connect ECONNREFUSED 127.0.0.1:587"));
    expect(mapped.code).toBe("SMTP-CONN-001");
  });

  it("usa código genérico para erros desconhecidos", () => {
    const mapped = mapSmtpError(new Error("something weird"));
    expect(mapped.code).toBe("SMTP-GEN-001");
  });
});
