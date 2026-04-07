/**
 * Seed de dados para testes RLS multi-tenant.
 *
 * Cria dois utilizadores reais via service_role e insere registos
 * em todas as tabelas críticas de tenant. Os UUIDs são determinísticos
 * para facilitar inspeção manual após os testes.
 *
 * CREDENCIAIS DOS UTILIZADORES DE TESTE:
 * ─────────────────────────────────────────────────────────────
 *   Tenant A → tenant_a_rls@nutrigestao.test / RlsTest@TenantA2026!
 *   Tenant B → tenant_b_rls@nutrigestao.test / RlsTest@TenantB2026!
 * ─────────────────────────────────────────────────────────────
 *
 * Para inspecionar os dados após os testes, autentique com estas
 * credenciais no Supabase Studio (http://localhost:54323).
 */
import {
  createServiceClient,
  getTestEnv,
  signInTenant,
  createTenantClient,
} from "../helpers/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export type SeedData = {
  tenantAId: string;
  tenantBId: string;
  tenantAToken: string;
  tenantBToken: string;
  clientA: SupabaseClient;
  clientB: SupabaseClient;
  ids: {
    // Tenant A
    a_client_id: string;
    a_establishment_id: string;
    a_patient_id: string;
    a_recipe_id: string;
    a_raw_material_id: string;
    a_pop_template_id: string;
    a_establishment_pop_id: string;
    a_contract_id: string;
    a_contract_template_id: string;
    a_portal_user_id: string;
    // Tenant B
    b_client_id: string;
    b_establishment_id: string;
    b_patient_id: string;
    b_recipe_id: string;
    b_raw_material_id: string;
    b_pop_template_id: string;
    b_establishment_pop_id: string;
    b_contract_id: string;
    b_contract_template_id: string;
    b_portal_user_id: string;
  };
};

async function ensureUser(
  service: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  // Tentar criar; se já existir, buscar o ID
  const { data: created } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.user) return created.user.id;

  // Utilizador já existe — listar e encontrar
  const { data: list } = await service.auth.admin.listUsers();
  const found = list?.users.find((u) => u.email === email);
  if (!found) throw new Error(`Não foi possível criar/encontrar user: ${email}`);
  return found.id;
}

async function seedTenantData(
  service: SupabaseClient,
  userId: string,
  label: "A" | "B",
) {
  const prefix = `RLS_TEST_${label}`;
  const ids: Record<string, string> = {};

  // ── clients ────────────────────────────────────────────────────────────────
  const { data: clientRow, error: clientErr } = await service
    .from("clients")
    .insert({
      owner_user_id: userId,
      name: `${prefix} Cliente`,
      type: "pf",
      email: `client_${label.toLowerCase()}@rls.test`,
    })
    .select("id")
    .single();
  if (clientErr) throw new Error(`clients ${label}: ${clientErr.message}`);
  ids[`${label.toLowerCase()}_client_id`] = clientRow!.id;

  // ── establishments ─────────────────────────────────────────────────────────
  const { data: estRow, error: estErr } = await service
    .from("establishments")
    .insert({
      owner_user_id: userId,
      client_id: clientRow!.id,
      name: `${prefix} Estabelecimento`,
      type: "hospital",
    })
    .select("id")
    .single();
  if (estErr) throw new Error(`establishments ${label}: ${estErr.message}`);
  ids[`${label.toLowerCase()}_establishment_id`] = estRow!.id;

  // ── patients ───────────────────────────────────────────────────────────────
  const { data: patientRow, error: patErr } = await service
    .from("patients")
    .insert({
      owner_user_id: userId,
      client_id: clientRow!.id,
      name: `${prefix} Paciente`,
      birth_date: "1990-01-01",
    })
    .select("id")
    .single();
  if (patErr) throw new Error(`patients ${label}: ${patErr.message}`);
  ids[`${label.toLowerCase()}_patient_id`] = patientRow!.id;

  // ── technical_recipes ──────────────────────────────────────────────────────
  const { data: recipeRow, error: recipeErr } = await service
    .from("technical_recipes")
    .insert({
      owner_user_id: userId,
      name: `${prefix} Receita`,
      yield_quantity: 1,
      yield_unit: "kg",
    })
    .select("id")
    .single();
  if (recipeErr) throw new Error(`technical_recipes ${label}: ${recipeErr.message}`);
  ids[`${label.toLowerCase()}_recipe_id`] = recipeRow!.id;

  // ── professional_raw_materials ─────────────────────────────────────────────
  const { data: rawRow, error: rawErr } = await service
    .from("professional_raw_materials")
    .insert({
      owner_user_id: userId,
      name: `${prefix} Matéria-Prima`,
      unit: "kg",
      cost_per_unit_cents: 100,
    })
    .select("id")
    .single();
  if (rawErr) throw new Error(`professional_raw_materials ${label}: ${rawErr.message}`);
  ids[`${label.toLowerCase()}_raw_material_id`] = rawRow!.id;

  // ── pop_templates ──────────────────────────────────────────────────────────
  const { data: popTplRow, error: popTplErr } = await service
    .from("pop_templates")
    .insert({
      owner_user_id: userId,
      title: `${prefix} POP Template`,
      establishment_type: "hospital",
      content: `Conteúdo do POP ${label}`,
    })
    .select("id")
    .single();
  if (popTplErr) throw new Error(`pop_templates ${label}: ${popTplErr.message}`);
  ids[`${label.toLowerCase()}_pop_template_id`] = popTplRow!.id;

  // ── establishment_pops ─────────────────────────────────────────────────────
  const { data: estPopRow, error: estPopErr } = await service
    .from("establishment_pops")
    .insert({
      owner_user_id: userId,
      establishment_id: estRow!.id,
      pop_template_id: popTplRow!.id,
      title: `${prefix} POP Estabelecimento`,
      content: `Conteúdo personalizado ${label}`,
      version: 1,
    })
    .select("id")
    .single();
  if (estPopErr) throw new Error(`establishment_pops ${label}: ${estPopErr.message}`);
  ids[`${label.toLowerCase()}_establishment_pop_id`] = estPopRow!.id;

  // ── client_contracts ───────────────────────────────────────────────────────
  const { data: contractRow, error: contractErr } = await service
    .from("client_contracts")
    .insert({
      owner_user_id: userId,
      client_id: clientRow!.id,
      billing_recurrence: "monthly",
      monthly_amount_cents: 9900,
      contract_start_date: "2026-01-01",
      contract_end_date: "2026-12-31",
    })
    .select("id")
    .single();
  if (contractErr) throw new Error(`client_contracts ${label}: ${contractErr.message}`);
  ids[`${label.toLowerCase()}_contract_id`] = contractRow!.id;

  // ── contract_templates (com owner_user_id — não global) ────────────────────
  const { data: cTplRow, error: cTplErr } = await service
    .from("contract_templates")
    .insert({
      owner_user_id: userId,
      title: `${prefix} Modelo de Contrato`,
      body_html: `<p>Contrato do Tenant ${label}</p>`,
    })
    .select("id")
    .single();
  if (cTplErr) throw new Error(`contract_templates ${label}: ${cTplErr.message}`);
  ids[`${label.toLowerCase()}_contract_template_id`] = cTplRow!.id;

  // ── external_portal_users ──────────────────────────────────────────────────
  const { data: portalRow, error: portalErr } = await service
    .from("external_portal_users")
    .insert({
      owner_user_id: userId,
      patient_id: patientRow!.id,
      email: `portal_${label.toLowerCase()}@rls.test`,
      full_name: `${prefix} Portal User`,
      role: "viewer",
      magic_link_token: crypto.randomUUID(),
      magic_link_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select("id")
    .single();
  if (portalErr) throw new Error(`external_portal_users ${label}: ${portalErr.message}`);
  ids[`${label.toLowerCase()}_portal_user_id`] = portalRow!.id;

  return ids;
}

export async function setupSeed(): Promise<SeedData> {
  const env = getTestEnv();
  const service = createServiceClient();

  console.log("🌱 Criando utilizadores de teste...");
  const [tenantAId, tenantBId] = await Promise.all([
    ensureUser(service, env.tenantAEmail, env.tenantAPassword),
    ensureUser(service, env.tenantBEmail, env.tenantBPassword),
  ]);

  console.log(`   Tenant A: ${tenantAId} (${env.tenantAEmail})`);
  console.log(`   Tenant B: ${tenantBId} (${env.tenantBEmail})`);

  console.log("🌱 Inserindo dados de seed...");
  const [idsA, idsB] = await Promise.all([
    seedTenantData(service, tenantAId, "A"),
    seedTenantData(service, tenantBId, "B"),
  ]);

  console.log("🔑 Autenticando tenants...");
  const [authA, authB] = await Promise.all([
    signInTenant(env.tenantAEmail, env.tenantAPassword),
    signInTenant(env.tenantBEmail, env.tenantBPassword),
  ]);

  const clientA = createTenantClient(authA.accessToken);
  const clientB = createTenantClient(authB.accessToken);

  console.log("✅ Seed completo. Dados disponíveis para inspeção:");
  console.log(`   Supabase Studio → http://localhost:54323`);
  console.log(
    `   Tenant A: ${env.tenantAEmail} / ${env.tenantAPassword}`,
  );
  console.log(
    `   Tenant B: ${env.tenantBEmail} / ${env.tenantBPassword}`,
  );

  return {
    tenantAId,
    tenantBId,
    tenantAToken: authA.accessToken,
    tenantBToken: authB.accessToken,
    clientA,
    clientB,
    ids: {
      ...idsA,
      ...idsB,
    } as SeedData["ids"],
  };
}

/**
 * Remove apenas os dados inseridos pelo seed, mantendo os utilizadores
 * (conforme pedido — "não precisa deletar ao final").
 * Os utilizadores permanecem para inspeção manual.
 */
export async function teardownSeed(seed: SeedData): Promise<void> {
  const service = createServiceClient();

  console.log("🧹 Limpando dados de seed (utilizadores mantidos)...");

  // Apagar na ordem correcta (FK constraints)
  const tables = [
    "external_portal_users",
    "patient_parental_consents",
    "external_access_permissions",
    "client_contracts",
    "contract_templates",
    "establishment_pops",
    "pop_templates",
    "professional_raw_materials",
    "technical_recipes",
    "patients",
    "establishments",
    "clients",
  ];

  for (const table of tables) {
    await service
      .from(table)
      .delete()
      .in("owner_user_id", [seed.tenantAId, seed.tenantBId]);
  }

  console.log("✅ Dados de seed removidos. Utilizadores mantidos para inspeção.");
  console.log(`   Tenant A: ${getTestEnv().tenantAEmail}`);
  console.log(`   Tenant B: ${getTestEnv().tenantBEmail}`);
}
