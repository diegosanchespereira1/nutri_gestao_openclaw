import { describe, expect, it } from "vitest";

import { buildTenantCapabilities } from "@/lib/admin/tenant-capabilities";

describe("buildTenantCapabilities", () => {
  const plansBySlug = {
    pro: {
      feature_portal_externo: true,
      feature_pdf_export: true,
      feature_csv_import: false,
      feature_api_access: false,
    },
  };

  it("lista módulos e features efetivas habilitadas", () => {
    const result = buildTenantCapabilities({
      enabledModulesRaw: {
        atendimento_nutricional: true,
        assessoria_alimentacao: false,
        visitas: true,
        financeiro: false,
      },
      planSlug: "pro",
      plansBySlug,
      overridesByKey: { feature_csv_import: true },
    });

    expect(result.modules.map((m) => m.key)).toEqual([
      "atendimento_nutricional",
      "visitas",
    ]);
    expect(result.features.map((f) => f.key)).toEqual([
      "feature_portal_externo",
      "feature_pdf_export",
      "feature_csv_import",
    ]);
    expect(result.features.find((f) => f.key === "feature_csv_import")?.overridden).toBe(
      true,
    );
  });
});
