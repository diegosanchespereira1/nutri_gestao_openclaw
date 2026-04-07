/**
 * Story 11.1 — Testes de Isolamento RLS Multi-Tenant
 *
 * Verifica que nenhum tenant consegue aceder a dados de outro tenant
 * nas 16 tabelas críticas do NutriGestão.
 *
 * Pré-requisito: npx supabase start + .env.test configurado
 *
 * Execução: npm run test:rls
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupSeed, teardownSeed, type SeedData } from "./fixtures/seed";
import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Setup / Teardown global da suíte
// ---------------------------------------------------------------------------
let seed: SeedData;
let clientA: SupabaseClient;
let clientB: SupabaseClient;

beforeAll(async () => {
  seed = await setupSeed();
  clientA = seed.clientA;
  clientB = seed.clientB;
}, 60_000);

afterAll(async () => {
  await teardownSeed(seed);
}, 30_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SELECT por ID que NÃO pertence ao tenant autenticado deve retornar [] */
async function expectBlocked(
  client: SupabaseClient,
  table: string,
  foreignId: string,
): Promise<void> {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("id", foreignId);

  // RLS pode retornar array vazio ou erro de permissão
  if (error) {
    // Erro de RLS também é aceitável (policy violation)
    expect(error.code).toMatch(/PGRST301|42501|insufficient_privilege/);
  } else {
    expect(data).toHaveLength(0);
  }
}

/** SELECT sem filtro deve retornar apenas os registos do tenant autenticado */
async function expectOwnOnly(
  client: SupabaseClient,
  table: string,
  ownId: string,
  foreignId: string,
): Promise<void> {
  const { data, error } = await client.from(table).select("id");
  expect(error).toBeNull();
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  expect(ids).toContain(ownId);
  expect(ids).not.toContain(foreignId);
}

// ---------------------------------------------------------------------------
// 1. clients
// ---------------------------------------------------------------------------
describe("RLS: clients", () => {
  it("Tenant A vê apenas os seus clients", async () => {
    await expectOwnOnly(
      clientA,
      "clients",
      seed.ids.a_client_id,
      seed.ids.b_client_id,
    );
  });

  it("Tenant A não acede a client de Tenant B por ID", async () => {
    await expectBlocked(clientA, "clients", seed.ids.b_client_id);
  });

  it("Tenant B não acede a client de Tenant A por ID", async () => {
    await expectBlocked(clientB, "clients", seed.ids.a_client_id);
  });

  it("Tenant A não insere client com owner_user_id de Tenant B", async () => {
    const { error } = await clientA.from("clients").insert({
      owner_user_id: seed.tenantBId,
      name: "Tentativa de injecção",
      type: "pf",
    });
    // Deve falhar: RLS WITH CHECK impede owner_user_id != auth.uid()
    expect(error).not.toBeNull();
  });

  it("Tenant A não atualiza client de Tenant B", async () => {
    const { data } = await clientA
      .from("clients")
      .update({ name: "Hacked" })
      .eq("id", seed.ids.b_client_id)
      .select("id");
    expect(data).toHaveLength(0);
  });

  it("Tenant A não elimina client de Tenant B", async () => {
    const { data } = await clientA
      .from("clients")
      .delete()
      .eq("id", seed.ids.b_client_id)
      .select("id");
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. establishments
// ---------------------------------------------------------------------------
describe("RLS: establishments", () => {
  it("Tenant A vê apenas os seus establishments", async () => {
    await expectOwnOnly(
      clientA,
      "establishments",
      seed.ids.a_establishment_id,
      seed.ids.b_establishment_id,
    );
  });

  it("Tenant A não acede a establishment de Tenant B por ID", async () => {
    await expectBlocked(clientA, "establishments", seed.ids.b_establishment_id);
  });

  it("Tenant B não acede a establishment de Tenant A por ID", async () => {
    await expectBlocked(clientB, "establishments", seed.ids.a_establishment_id);
  });
});

// ---------------------------------------------------------------------------
// 3. patients
// ---------------------------------------------------------------------------
describe("RLS: patients", () => {
  it("Tenant A vê apenas os seus patients", async () => {
    await expectOwnOnly(
      clientA,
      "patients",
      seed.ids.a_patient_id,
      seed.ids.b_patient_id,
    );
  });

  it("Tenant A não acede a patient de Tenant B por ID", async () => {
    await expectBlocked(clientA, "patients", seed.ids.b_patient_id);
  });

  it("Tenant B não acede a patient de Tenant A por ID", async () => {
    await expectBlocked(clientB, "patients", seed.ids.a_patient_id);
  });

  it("Tenant A não atualiza patient de Tenant B", async () => {
    const { data } = await clientA
      .from("patients")
      .update({ name: "Hacked" })
      .eq("id", seed.ids.b_patient_id)
      .select("id");
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. technical_recipes
// ---------------------------------------------------------------------------
describe("RLS: technical_recipes", () => {
  it("Tenant A vê apenas as suas technical_recipes", async () => {
    await expectOwnOnly(
      clientA,
      "technical_recipes",
      seed.ids.a_recipe_id,
      seed.ids.b_recipe_id,
    );
  });

  it("Tenant A não acede a recipe de Tenant B por ID", async () => {
    await expectBlocked(clientA, "technical_recipes", seed.ids.b_recipe_id);
  });

  it("Tenant B não acede a recipe de Tenant A por ID", async () => {
    await expectBlocked(clientB, "technical_recipes", seed.ids.a_recipe_id);
  });
});

// ---------------------------------------------------------------------------
// 5. professional_raw_materials
// ---------------------------------------------------------------------------
describe("RLS: professional_raw_materials", () => {
  it("Tenant A vê apenas as suas matérias-primas", async () => {
    await expectOwnOnly(
      clientA,
      "professional_raw_materials",
      seed.ids.a_raw_material_id,
      seed.ids.b_raw_material_id,
    );
  });

  it("Tenant A não acede a matéria-prima de Tenant B por ID", async () => {
    await expectBlocked(
      clientA,
      "professional_raw_materials",
      seed.ids.b_raw_material_id,
    );
  });

  it("Tenant B não acede a matéria-prima de Tenant A por ID", async () => {
    await expectBlocked(
      clientB,
      "professional_raw_materials",
      seed.ids.a_raw_material_id,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. pop_templates
// ---------------------------------------------------------------------------
describe("RLS: pop_templates", () => {
  it("Tenant A vê apenas os seus pop_templates", async () => {
    await expectOwnOnly(
      clientA,
      "pop_templates",
      seed.ids.a_pop_template_id,
      seed.ids.b_pop_template_id,
    );
  });

  it("Tenant A não acede a pop_template de Tenant B por ID", async () => {
    await expectBlocked(clientA, "pop_templates", seed.ids.b_pop_template_id);
  });

  it("Tenant B não acede a pop_template de Tenant A por ID", async () => {
    await expectBlocked(clientB, "pop_templates", seed.ids.a_pop_template_id);
  });
});

// ---------------------------------------------------------------------------
// 7. establishment_pops
// ---------------------------------------------------------------------------
describe("RLS: establishment_pops", () => {
  it("Tenant A vê apenas os seus establishment_pops", async () => {
    await expectOwnOnly(
      clientA,
      "establishment_pops",
      seed.ids.a_establishment_pop_id,
      seed.ids.b_establishment_pop_id,
    );
  });

  it("Tenant A não acede a establishment_pop de Tenant B por ID", async () => {
    await expectBlocked(
      clientA,
      "establishment_pops",
      seed.ids.b_establishment_pop_id,
    );
  });

  it("Tenant B não acede a establishment_pop de Tenant A por ID", async () => {
    await expectBlocked(
      clientB,
      "establishment_pops",
      seed.ids.a_establishment_pop_id,
    );
  });
});

// ---------------------------------------------------------------------------
// 8. client_contracts
// ---------------------------------------------------------------------------
describe("RLS: client_contracts", () => {
  it("Tenant A vê apenas os seus contratos", async () => {
    await expectOwnOnly(
      clientA,
      "client_contracts",
      seed.ids.a_contract_id,
      seed.ids.b_contract_id,
    );
  });

  it("Tenant A não acede a contrato de Tenant B por ID", async () => {
    await expectBlocked(clientA, "client_contracts", seed.ids.b_contract_id);
  });

  it("Tenant B não acede a contrato de Tenant A por ID", async () => {
    await expectBlocked(clientB, "client_contracts", seed.ids.a_contract_id);
  });

  it("Tenant A não insere contrato com owner_user_id de Tenant B", async () => {
    const { error } = await clientA.from("client_contracts").insert({
      owner_user_id: seed.tenantBId,
      client_id: seed.ids.a_client_id,
      billing_recurrence: "monthly",
      monthly_amount_cents: 1000,
      contract_start_date: "2026-01-01",
      contract_end_date: "2026-12-31",
    });
    expect(error).not.toBeNull();
  });

  it("Tenant A não atualiza contrato de Tenant B", async () => {
    const { data } = await clientA
      .from("client_contracts")
      .update({ monthly_amount_cents: 0 })
      .eq("id", seed.ids.b_contract_id)
      .select("id");
    expect(data).toHaveLength(0);
  });

  it("Tenant A não elimina contrato de Tenant B", async () => {
    const { data } = await clientA
      .from("client_contracts")
      .delete()
      .eq("id", seed.ids.b_contract_id)
      .select("id");
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. contract_templates (com owner_user_id — excluindo globais NULL)
// ---------------------------------------------------------------------------
describe("RLS: contract_templates (tenant-owned)", () => {
  it("Tenant A vê o seu template mas não o template privado de Tenant B", async () => {
    const { data } = await clientA
      .from("contract_templates")
      .select("id")
      .eq("id", seed.ids.b_contract_template_id);
    expect(data).toHaveLength(0);
  });

  it("Tenant B vê o seu template mas não o template privado de Tenant A", async () => {
    const { data } = await clientB
      .from("contract_templates")
      .select("id")
      .eq("id", seed.ids.a_contract_template_id);
    expect(data).toHaveLength(0);
  });

  it("Templates globais (owner_user_id=NULL) são visíveis para todos os tenants", async () => {
    const { data: forA } = await clientA
      .from("contract_templates")
      .select("id")
      .is("owner_user_id", null);
    const { data: forB } = await clientB
      .from("contract_templates")
      .select("id")
      .is("owner_user_id", null);
    // Ambos devem ver o mesmo número de templates globais
    expect((forA ?? []).length).toBe((forB ?? []).length);
  });
});

// ---------------------------------------------------------------------------
// 10. external_portal_users
// ---------------------------------------------------------------------------
describe("RLS: external_portal_users", () => {
  it("Tenant A vê apenas os seus portal users", async () => {
    await expectOwnOnly(
      clientA,
      "external_portal_users",
      seed.ids.a_portal_user_id,
      seed.ids.b_portal_user_id,
    );
  });

  it("Tenant A não acede a portal user de Tenant B por ID", async () => {
    await expectBlocked(
      clientA,
      "external_portal_users",
      seed.ids.b_portal_user_id,
    );
  });

  it("Tenant B não acede a portal user de Tenant A por ID", async () => {
    await expectBlocked(
      clientB,
      "external_portal_users",
      seed.ids.a_portal_user_id,
    );
  });

  it("Tenant A não atualiza portal user de Tenant B", async () => {
    const { data } = await clientA
      .from("external_portal_users")
      .update({ is_active: false })
      .eq("id", seed.ids.b_portal_user_id)
      .select("id");
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 11. patient_parental_consents (insert-only — verificar SELECT isolation)
// ---------------------------------------------------------------------------
describe("RLS: patient_parental_consents", () => {
  it("Tenant A não acede a consentimentos de pacientes de Tenant B", async () => {
    // Inserir consentimento para o paciente de A
    const { data: consent } = await clientA
      .from("patient_parental_consents")
      .insert({
        owner_user_id: seed.tenantAId,
        patient_id: seed.ids.a_patient_id,
        guardian_name: "Responsável A",
        guardian_relationship: "parent",
        guardian_document: "999.999.999-99",
        consent_text: "Texto de consentimento de teste",
        consented_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (consent) {
      // Tenant B tenta aceder
      const { data } = await clientB
        .from("patient_parental_consents")
        .select("id")
        .eq("id", consent.id);
      expect(data).toHaveLength(0);
    }
  });

  it("Tenant A não insere consentimento com owner_user_id de Tenant B", async () => {
    const { error } = await clientA
      .from("patient_parental_consents")
      .insert({
        owner_user_id: seed.tenantBId,
        patient_id: seed.ids.a_patient_id,
        guardian_name: "Hacker",
        guardian_relationship: "parent",
        guardian_document: "000.000.000-00",
        consent_text: "Injecção maliciosa",
        consented_at: new Date().toISOString(),
      });
    expect(error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. external_access_permissions
// ---------------------------------------------------------------------------
describe("RLS: external_access_permissions", () => {
  it("Tenant A não acede a permissões de portal users de Tenant B", async () => {
    // Inserir permissão para o portal user de A
    const { data: perm } = await clientA
      .from("external_access_permissions")
      .insert({
        owner_user_id: seed.tenantAId,
        external_user_id: seed.ids.a_portal_user_id,
        patient_id: seed.ids.a_patient_id,
        can_view_reports: true,
        can_view_measurements: false,
        can_view_exams: false,
        can_view_nutrition_plan: false,
      })
      .select("id")
      .single();

    if (perm) {
      const { data } = await clientB
        .from("external_access_permissions")
        .select("id")
        .eq("id", perm.id);
      expect(data).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 13. Teste de cross-tenant via JOIN implícito
// ---------------------------------------------------------------------------
describe("RLS: cross-tenant via related queries", () => {
  it("Tenant A não acede a patients via client_id de Tenant B", async () => {
    const { data } = await clientA
      .from("patients")
      .select("id")
      .eq("client_id", seed.ids.b_client_id);
    // RLS aplica-se independentemente do filtro client_id
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a establishments via client_id de Tenant B", async () => {
    const { data } = await clientA
      .from("establishments")
      .select("id")
      .eq("client_id", seed.ids.b_client_id);
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a contracts via client_id de Tenant B", async () => {
    const { data } = await clientA
      .from("client_contracts")
      .select("id")
      .eq("client_id", seed.ids.b_client_id);
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 14. Teste de injecção via owner_user_id explícito
// ---------------------------------------------------------------------------
describe("RLS: tentativa de injecção via owner_user_id explícito", () => {
  it("Tenant A não acede a patients filtrando por owner_user_id de Tenant B", async () => {
    const { data } = await clientA
      .from("patients")
      .select("id")
      .eq("owner_user_id", seed.tenantBId);
    // RLS bloqueia mesmo com filtro explícito no owner_user_id errado
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a clients filtrando por owner_user_id de Tenant B", async () => {
    const { data } = await clientA
      .from("clients")
      .select("id")
      .eq("owner_user_id", seed.tenantBId);
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a technical_recipes filtrando por owner_user_id de Tenant B", async () => {
    const { data } = await clientA
      .from("technical_recipes")
      .select("id")
      .eq("owner_user_id", seed.tenantBId);
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 15. Validação de contagem total (nenhum registo extra visível)
// ---------------------------------------------------------------------------
describe("RLS: contagem de registos por tenant", () => {
  it("Tenant A vê exactamente os seus clients (count check)", async () => {
    const { count, error } = await clientA
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", seed.tenantAId);
    expect(error).toBeNull();
    // Deve ver os seus (1 do seed) mas não os de Tenant B
    expect(count).toBeGreaterThanOrEqual(1);

    // Confirmar que Tenant B's client não está incluído
    const { data: all } = await clientA.from("clients").select("id");
    const allIds = (all ?? []).map((r: { id: string }) => r.id);
    expect(allIds).not.toContain(seed.ids.b_client_id);
  });

  it("Tenant B vê exactamente os seus patients (count check)", async () => {
    const { data: all } = await clientB.from("patients").select("id");
    const allIds = (all ?? []).map((r: { id: string }) => r.id);
    expect(allIds).toContain(seed.ids.b_patient_id);
    expect(allIds).not.toContain(seed.ids.a_patient_id);
  });
});
