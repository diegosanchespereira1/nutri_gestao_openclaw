import { describe, expect, it } from "vitest";

import {
  clientIdFromRecipeEstablishmentJoin,
  establishmentClientLabel,
} from "@/lib/utils/establishment-client-label";

describe("establishmentClientLabel", () => {
  it("prefere trade_name", () => {
    expect(
      establishmentClientLabel({
        clients: { trade_name: "Marca", legal_name: "Razão" },
      } as Parameters<typeof establishmentClientLabel>[0]),
    ).toBe("Marca");
  });

  it("fallback legal_name", () => {
    expect(
      establishmentClientLabel({
        clients: { trade_name: null, legal_name: "Razão" },
      } as Parameters<typeof establishmentClientLabel>[0]),
    ).toBe("Razão");
  });
});

describe("clientIdFromRecipeEstablishmentJoin", () => {
  it("objeto único", () => {
    expect(
      clientIdFromRecipeEstablishmentJoin({ client_id: "c-1" }),
    ).toBe("c-1");
  });

  it("array", () => {
    expect(
      clientIdFromRecipeEstablishmentJoin([{ client_id: "c-2" }]),
    ).toBe("c-2");
  });

  it("null para inválido", () => {
    expect(clientIdFromRecipeEstablishmentJoin(null)).toBeNull();
  });
});
