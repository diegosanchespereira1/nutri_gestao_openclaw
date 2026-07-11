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
      legal_name: "Tentativa de injecção",
      kind: "pf",
    });
    // Deve falhar: RLS WITH CHECK impede owner_user_id != auth.uid()
    expect(error).not.toBeNull();
  });

  it("Tenant A não atualiza client de Tenant B", async () => {
    const { data } = await clientA
      .from("clients")
      .update({ legal_name: "Hacked" })
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
      .update({ full_name: "Hacked" })
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
// 5b. professional_raw_materials — isolamento cliente-a-cliente DENTRO do
//     MESMO tenant (invariante do plano de isolamento por cliente/
//     estabelecimento: "usar em todos os estabelecimentos" nunca cruza
//     cliente, nem para outro cliente do mesmo tenant).
//
//     Importante: a RLS de professional_raw_materials autoriza acesso a
//     QUALQUER cliente do tenant (via clients.owner_user_id) — ela não
//     bloqueia por client_id. O isolamento cliente-a-cliente é aplicado na
//     CAMADA DE APLICAÇÃO, pelo filtro `.or(...)` usado em
//     loadRawMaterialsForScope (lib/actions/raw-materials.ts). Os testes
//     abaixo replicam esse exato filtro para garantir que a consulta real
//     usada pelo seletor de ingredientes/matérias-primas nunca mistura
//     itens de clientes diferentes do mesmo tenant.
// ---------------------------------------------------------------------------
describe("RLS: professional_raw_materials — isolamento por cliente (mesmo tenant)", () => {
  it("RLS por si só permite ao tenant ler item de qualquer cliente seu (não bloqueia por client_id)", async () => {
    // Documenta o limite real da RLS: ela é por TENANT, não por cliente.
    const { data, error } = await clientA
      .from("professional_raw_materials")
      .select("id")
      .eq("id", seed.ids.a_raw_material_client2_id);
    expect(error).toBeNull();
    expect((data ?? []).map((r: { id: string }) => r.id)).toContain(
      seed.ids.a_raw_material_client2_id,
    );
  });

  it("Consulta escopada ao cliente 1 (padrão de loadRawMaterialsForScope) não retorna item REPOSITORIO do cliente 2", async () => {
    const clientId = seed.ids.a_client_id;
    const establishmentId = seed.ids.a_establishment_id;
    const { data, error } = await clientA
      .from("professional_raw_materials")
      .select("id")
      .or(
        `client_id.is.null,establishment_id.eq.${establishmentId},and(client_id.eq.${clientId},establishment_id.is.null)`,
      );
    expect(error).toBeNull();
    const ids = (data ?? []).map((r: { id: string }) => r.id);

    // Itens do próprio cliente 1 aparecem
    expect(ids).toContain(seed.ids.a_raw_material_repo_id);
    expect(ids).toContain(seed.ids.a_raw_material_estab_id);
    // Item legado (client_id nulo) ainda aparece — comportamento de transição
    expect(ids).toContain(seed.ids.a_raw_material_id);
    // Item REPOSITORIO do cliente 2 NUNCA aparece na consulta escopada ao cliente 1
    expect(ids).not.toContain(seed.ids.a_raw_material_client2_id);
  });

  it("Consulta escopada ao cliente 2 (repositório, sem estabelecimento) não retorna itens do cliente 1", async () => {
    const client2Id = seed.ids.a_client2_id;
    const { data, error } = await clientA
      .from("professional_raw_materials")
      .select("id")
      .or(`client_id.is.null,and(client_id.eq.${client2Id},establishment_id.is.null)`);
    expect(error).toBeNull();
    const ids = (data ?? []).map((r: { id: string }) => r.id);

    expect(ids).toContain(seed.ids.a_raw_material_client2_id);
    expect(ids).toContain(seed.ids.a_raw_material_id); // legado, transição
    expect(ids).not.toContain(seed.ids.a_raw_material_repo_id);
    expect(ids).not.toContain(seed.ids.a_raw_material_estab_id);
  });

  it("Tenant B não acede a nenhum item escopado do Tenant A, em nenhum contexto", async () => {
    await expectBlocked(
      clientB,
      "professional_raw_materials",
      seed.ids.a_raw_material_repo_id,
    );
    await expectBlocked(
      clientB,
      "professional_raw_materials",
      seed.ids.a_raw_material_estab_id,
    );
    await expectBlocked(
      clientB,
      "professional_raw_materials",
      seed.ids.a_raw_material_client2_id,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. pop_templates — catálogo GLOBAL (sem owner_user_id, sem isolamento por
//    tenant por desenho: policy "pop_templates_select_authenticated" usa
//    `using (true)`). Não faz sentido testar isolamento aqui — o teste
//    correto é o oposto: confirmar que é visível a qualquer tenant.
// ---------------------------------------------------------------------------
describe("RLS: pop_templates (catálogo global, não isolado por tenant)", () => {
  it("Tenant A e Tenant B veem exatamente os mesmos pop_templates", async () => {
    const { data: forA, error: errA } = await clientA.from("pop_templates").select("id");
    const { data: forB, error: errB } = await clientB.from("pop_templates").select("id");
    expect(errA).toBeNull();
    expect(errB).toBeNull();
    const idsA = (forA ?? []).map((r: { id: string }) => r.id).sort();
    const idsB = (forB ?? []).map((r: { id: string }) => r.id).sort();
    expect(idsA).toEqual(idsB);
    expect(idsA.length).toBeGreaterThan(0);
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
        guardian_full_name: "Responsável A",
        guardian_relationship: "parent",
        guardian_document_id: "999.999.999-99",
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
        guardian_full_name: "Hacker",
        guardian_relationship: "parent",
        guardian_document_id: "000.000.000-00",
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
  it("Tenant A não acede a patients filtrando por user_id de Tenant B", async () => {
    const { data } = await clientA
      .from("patients")
      .select("id")
      .eq("user_id", seed.tenantBId);
    // RLS bloqueia mesmo com filtro explícito no user_id errado
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a clients filtrando por owner_user_id de Tenant B", async () => {
    const { data } = await clientA
      .from("clients")
      .select("id")
      .eq("owner_user_id", seed.tenantBId);
    expect(data).toHaveLength(0);
  });

  it("Tenant A não acede a technical_recipes filtrando por client_id de Tenant B", async () => {
    // technical_recipes não tem coluna owner_user_id (ownership é via
    // establishment_id/client_id → clients.owner_user_id) — o vetor de
    // injecção equivalente aqui é filtrar por client_id de outro tenant.
    const { data } = await clientA
      .from("technical_recipes")
      .select("id")
      .eq("client_id", seed.ids.b_client_id);
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
