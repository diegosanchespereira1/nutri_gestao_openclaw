import { describe, expect, it } from "vitest";

import {
  collectValidUniqueEmails,
  parseDossierRecipientEmailsFromText,
} from "@/lib/validators/dossier-email-recipients";

describe("parseDossierRecipientEmailsFromText", () => {
  it("parseia emails separados por vírgula", () => {
    const r = parseDossierRecipientEmailsFromText(
      "a@test.com, b@test.com",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emails).toEqual(["a@test.com", "b@test.com"]);
  });

  it("deduplica emails", () => {
    const r = parseDossierRecipientEmailsFromText("a@test.com; a@test.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emails).toEqual(["a@test.com"]);
  });

  it("rejeita email inválido", () => {
    expect(parseDossierRecipientEmailsFromText("invalido").ok).toBe(false);
  });

  it("rejeita mais de 5 destinatários", () => {
    const r = parseDossierRecipientEmailsFromText(
      "1@t.com,2@t.com,3@t.com,4@t.com,5@t.com,6@t.com",
    );
    expect(r.ok).toBe(false);
  });
});

describe("collectValidUniqueEmails", () => {
  it("coleta emails únicos de vários campos", () => {
    expect(
      collectValidUniqueEmails(["a@test.com", "b@test.com, a@test.com"]),
    ).toEqual(["a@test.com", "b@test.com"]);
  });

  it("ignora entradas inválidas", () => {
    expect(collectValidUniqueEmails(["invalido", "ok@test.com"])).toEqual([
      "ok@test.com",
    ]);
  });
});
