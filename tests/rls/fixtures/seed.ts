/**
 * Seed de dados para testes RLS multi-tenant.
 *
 * Cria dois utilizadores reais via service_role e insere registos
 * em todas as tabelas críticas de tenant. Os UUIDs são determinísticos
 * para facilitar inspeção manual após os testes.
 *
 * Os nomes de coluna/tabela abaixo são verificados contra o schema real
 * (supabase/migrations/*.sql) — não contra suposições. Notas relevantes:
 *  - clients: coluna é `kind` (não `type`), nome é `legal_name` (não `name`).
 *  - establishments: sem `owner_user_id` (ownership vem de clients via
 *    client_id); coluna é `establishment_type` (não `type`); só é permitido
 *    para clientes kind='pj'; máx. 1 estabelecimento por cliente (unique
 *    constraint `establishments_one_per_client`).
 *  - patients: sem `owner_user_id` — usa `user_id` diretamente; `full_name`
 *    (não `name`); cliente kind='pj' exige establishment_id preenchido
 *    (trigger patients_enforce_vinculo).
 *  - technical_recipes: sem `owner_user_id` — ownership via establishment_id
 *    → establishments → clients, ou via client_id direto (repositório).
 *  - professional_raw_materials: `price_unit`/`unit_price_brl` (não
 *    `unit`/`cost_per_unit_cents`).
 *  - pop_templates: catálogo GLOBAL (sem owner_user_id, sem isolamento por
 *    tenant) — não é seedado por tenant aqui.
 *  - establishment_pops: sem `owner_user_id`, sem colunas `content`/`version`
 *    (conteúdo versionado vive em `pop_versions`, não usado neste seed).
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
    a_establishment_pop_id: string;
    a_contract_id: string;
    a_contract_template_id: string;
    a_portal_user_id: string;
    // Tenant A — segundo cliente do MESMO tenant (isolamento cliente-a-cliente)
    a_client2_id: string;
    a_establishment2_id: string;
    a_raw_material_repo_id: string; // REPOSITORIO do cliente 1
    a_raw_material_estab_id: string; // ESTABELECIMENTO do cliente 1
    a_raw_material_client2_id: string; // REPOSITORIO do cliente 2 (não pode vazar p/ cliente 1)
    // Tenant B
    b_client_id: string;
    b_establishment_id: string;
    b_patient_id: string;
    b_recipe_id: string;
    b_raw_material_id: string;
    b_establishment_pop_id: string;
    b_contract_id: string;
    b_contract_template_id: string;
    b_portal_user_id: string;
  };
};

type TenantSeedResult = {
  ids: Record<string, string>;
  clientIds: string[];
  establishmentIds: string[];
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
): Promise<TenantSeedResult> {
  const prefix = `RLS_TEST_${label}`;
  const ids: Record<string, string> = {};
  const clientIds: string[] = [];
  const establishmentIds: string[] = [];

  // ── clients (kind='pj' — precisamos de estabelecimento para patients/receitas) ──
  const { data: clientRow, error: clientErr } = await service
    .from("clients")
    .insert({
      owner_user_id: userId,
      kind: "pj",
      legal_name: `${prefix} Cliente`,
      email: `client_${label.toLowerCase()}@rls.test`,
    })
    .select("id")
    .single();
  if (clientErr) throw new Error(`clients ${label}: ${clientErr.message}`);
  ids[`${label.toLowerCase()}_client_id`] = clientRow!.id;
  clientIds.push(clientRow!.id);

  // ── establishments (1 por cliente; address_line1 é nullable) ────────────────
  const { data: estRow, error: estErr } = await service
    .from("establishments")
    .insert({
      client_id: clientRow!.id,
      name: `${prefix} Estabelecimento`,
      establishment_type: "hospital",
    })
    .select("id")
    .single();
  if (estErr) throw new Error(`establishments ${label}: ${estErr.message}`);
  ids[`${label.toLowerCase()}_establishment_id`] = estRow!.id;
  establishmentIds.push(estRow!.id);

  // ── patients (tenant via user_id; cliente pj exige establishment_id) ────────
  const { data: patientRow, error: patErr } = await service
    .from("patients")
    .insert({
      user_id: userId,
      client_id: clientRow!.id,
      establishment_id: estRow!.id,
      full_name: `${prefix} Paciente`,
      birth_date: "1990-01-01",
    })
    .select("id")
    .single();
  if (patErr) throw new Error(`patients ${label}: ${patErr.message}`);
  ids[`${label.toLowerCase()}_patient_id`] = patientRow!.id;

  // ── technical_recipes (ownership via establishment_id; client_id auto) ──────
  const { data: recipeRow, error: recipeErr } = await service
    .from("technical_recipes")
    .insert({
      establishment_id: estRow!.id,
      name: `${prefix} Receita`,
    })
    .select("id")
    .single();
  if (recipeErr) throw new Error(`technical_recipes ${label}: ${recipeErr.message}`);
  ids[`${label.toLowerCase()}_recipe_id`] = recipeRow!.id;

  // ── professional_raw_materials (item legado — sem client_id, ainda visível
  //    a todo o tenant, comportamento de transição) ────────────────────────────
  const { data: rawRow, error: rawErr } = await service
    .from("professional_raw_materials")
    .insert({
      owner_user_id: userId,
      name: `${prefix} Matéria-Prima`,
      price_unit: "kg",
      unit_price_brl: 10,
    })
    .select("id")
    .single();
  if (rawErr) throw new Error(`professional_raw_materials ${label}: ${rawErr.message}`);
  ids[`${label.toLowerCase()}_raw_material_id`] = rawRow!.id;

  // ── establishment_pops (sem owner_user_id, sem pop_template obrigatório) ────
  const { data: estPopRow, error: estPopErr } = await service
    .from("establishment_pops")
    .insert({
      establishment_id: estRow!.id,
      title: `${prefix} POP Estabelecimento`,
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

  return { ids, clientIds, establishmentIds };
}

/**
 * Fixtures extra para o Tenant A: um SEGUNDO cliente (mesmo tenant/dono) com
 * o seu próprio estabelecimento, e matérias-primas nos três estados de
 * escopo — necessário para provar a invariante "usar em todos os
 * estabelecimentos nunca cruza cliente": mesmo dentro do MESMO tenant, um
 * item REPOSITORIO/ESTABELECIMENTO do cliente 1 não pode aparecer numa
 * consulta escopada para o cliente 2, e vice-versa.
 */
async function seedClientScopeFixtures(
  service: SupabaseClient,
  userId: string,
  client1Id: string,
  establishment1Id: string,
): Promise<{
  ids: Record<string, string>;
  clientIds: string[];
  establishmentIds: string[];
}> {
  const prefix = "RLS_TEST_A2";
  const ids: Record<string, string> = {};

  // ── segundo cliente PJ do mesmo tenant ───────────────────────────────────
  const { data: client2Row, error: client2Err } = await service
    .from("clients")
    .insert({
      owner_user_id: userId,
      kind: "pj",
      legal_name: `${prefix} Cliente`,
      email: "client_a2@rls.test",
    })
    .select("id")
    .single();
  if (client2Err) throw new Error(`clients A2: ${client2Err.message}`);
  ids["a_client2_id"] = client2Row!.id;

  const { data: est2Row, error: est2Err } = await service
    .from("establishments")
    .insert({
      client_id: client2Row!.id,
      name: `${prefix} Estabelecimento`,
      establishment_type: "hospital",
    })
    .select("id")
    .single();
  if (est2Err) throw new Error(`establishments A2: ${est2Err.message}`);
  ids["a_establishment2_id"] = est2Row!.id;

  // ── matéria-prima REPOSITORIO do cliente 1 ───────────────────────────────
  const { data: repoRow, error: repoErr } = await service
    .from("professional_raw_materials")
    .insert({
      owner_user_id: userId,
      name: "RLS_TEST_A MP Repositório C1",
      price_unit: "kg",
      unit_price_brl: 20,
      client_id: client1Id,
      contexto: "REPOSITORIO",
    })
    .select("id")
    .single();
  if (repoErr) throw new Error(`professional_raw_materials (repo c1): ${repoErr.message}`);
  ids["a_raw_material_repo_id"] = repoRow!.id;

  // ── matéria-prima ESTABELECIMENTO do cliente 1 ───────────────────────────
  const { data: estRawRow, error: estRawErr } = await service
    .from("professional_raw_materials")
    .insert({
      owner_user_id: userId,
      name: "RLS_TEST_A MP Estabelecimento C1",
      price_unit: "kg",
      unit_price_brl: 30,
      establishment_id: establishment1Id,
      contexto: "ESTABELECIMENTO",
    })
    .select("id")
    .single();
  if (estRawErr) throw new Error(`professional_raw_materials (estab c1): ${estRawErr.message}`);
  ids["a_raw_material_estab_id"] = estRawRow!.id;

  // ── matéria-prima REPOSITORIO do cliente 2 — não pode vazar para o cliente 1 ──
  const { data: repo2Row, error: repo2Err } = await service
    .from("professional_raw_materials")
    .insert({
      owner_user_id: userId,
      name: `${prefix} MP Repositório C2`,
      price_unit: "kg",
      unit_price_brl: 40,
      client_id: client2Row!.id,
      contexto: "REPOSITORIO",
    })
    .select("id")
    .single();
  if (repo2Err) throw new Error(`professional_raw_materials (repo c2): ${repo2Err.message}`);
  ids["a_raw_material_client2_id"] = repo2Row!.id;

  return {
    ids,
    clientIds: [client2Row!.id],
    establishmentIds: [est2Row!.id],
  };
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
  const [resultA, resultB] = await Promise.all([
    seedTenantData(service, tenantAId, "A"),
    seedTenantData(service, tenantBId, "B"),
  ]);

  console.log("🌱 Inserindo fixtures de isolamento cliente-a-cliente (Tenant A)...");
  const resultA2 = await seedClientScopeFixtures(
    service,
    tenantAId,
    resultA.ids["a_client_id"]!,
    resultA.ids["a_establishment_id"]!,
  );

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
      ...resultA.ids,
      ...resultB.ids,
      ...resultA2.ids,
    } as SeedData["ids"],
  };
}

/**
 * Remove apenas os dados inseridos pelo seed, mantendo os utilizadores
 * (conforme pedido — "não precisa deletar ao final").
 * Os utilizadores permanecem para inspeção manual.
 *
 * Importante: establishments, technical_recipes e patients NÃO têm coluna
 * owner_user_id no schema atual — a limpeza usa client_id/user_id conforme
 * a tabela. Deletar por owner_user_id nessas tabelas seria um no-op
 * silencioso (Supabase ignora `.in()` num filtro de coluna inexistente
 * como erro, não como exceção lançada), deixando dados órfãos entre execuções.
 */
export async function teardownSeed(seed: SeedData): Promise<void> {
  const service = createServiceClient();

  console.log("🧹 Limpando dados de seed (utilizadores mantidos)...");

  const ownerIds = [seed.tenantAId, seed.tenantBId];
  const clientIds = [
    seed.ids.a_client_id,
    seed.ids.a_client2_id,
    seed.ids.b_client_id,
  ].filter(Boolean);
  const establishmentIds = [
    seed.ids.a_establishment_id,
    seed.ids.a_establishment2_id,
    seed.ids.b_establishment_id,
  ].filter(Boolean);

  // Ordem importa por causa de FKs "on delete restrict"
  // (professional_raw_materials/technical_recipes → clients/establishments).
  await service.from("external_portal_users").delete().in("owner_user_id", ownerIds);
  await service.from("patient_parental_consents").delete().in("owner_user_id", ownerIds);
  await service.from("external_access_permissions").delete().in("owner_user_id", ownerIds);
  await service.from("client_contracts").delete().in("owner_user_id", ownerIds);
  await service.from("contract_templates").delete().in("owner_user_id", ownerIds);
  await service.from("establishment_pops").delete().in("establishment_id", establishmentIds);
  await service.from("professional_raw_materials").delete().in("owner_user_id", ownerIds);
  await service.from("technical_recipes").delete().in("client_id", clientIds);
  await service.from("patients").delete().in("user_id", ownerIds);
  await service.from("establishments").delete().in("client_id", clientIds);
  await service.from("clients").delete().in("owner_user_id", ownerIds);

  console.log("✅ Dados de seed removidos. Utilizadores mantidos para inspeção.");
  console.log(`   Tenant A: ${getTestEnv().tenantAEmail}`);
  console.log(`   Tenant B: ${getTestEnv().tenantBEmail}`);
}
