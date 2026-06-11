/**
 * RLS: Políticas de escrita para admin em checklist_templates
 *
 * Verifica que:
 *   - Utilizadores com role admin/super_admin podem INSERT/UPDATE/DELETE
 *     nas tabelas checklist_templates, checklist_template_sections e
 *     checklist_template_items
 *   - Utilizadores sem role de admin são bloqueados pelo RLS nessas mesmas
 *     operações
 *
 * Migration relacionada:
 *   supabase/migrations/20260528100001_admin_write_policies_checklist_templates.sql
 *
 * Pré-requisito: npx supabase start + .env.test configurado
 * Execução: npm run test:rls
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceClient,
  signInTenant,
  createTenantClient,
} from "./helpers/supabase";

// ---------------------------------------------------------------------------
// Fixtures locais
// ---------------------------------------------------------------------------

type LocalSeed = {
  adminClient: SupabaseClient;
  regularClient: SupabaseClient;
  service: SupabaseClient;
  adminId: string;
  regularId: string;
  templateId: string;
  sectionId: string;
  itemId: string;
};

const ADMIN_EMAIL = "admin_rls_write@nutrigestao.test";
const ADMIN_PASSWORD = "RlsTest@Admin2026!";
const REGULAR_EMAIL = "regular_rls_write@nutrigestao.test";
const REGULAR_PASSWORD = "RlsTest@Regular2026!";

async function ensureUser(
  service: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data: created } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.user) return created.user.id;

  const { data: list } = await service.auth.admin.listUsers();
  const found = list?.users.find((u) => u.email === email);
  if (!found) throw new Error(`Não foi possível criar/encontrar user: ${email}`);
  return found.id;
}

let seed: LocalSeed;

beforeAll(async () => {
  const service = createServiceClient();

  // Criar utilizadores
  const [adminId, regularId] = await Promise.all([
    ensureUser(service, ADMIN_EMAIL, ADMIN_PASSWORD),
    ensureUser(service, REGULAR_EMAIL, REGULAR_PASSWORD),
  ]);

  // Definir role admin no perfil
  await service.from("profiles").upsert(
    { user_id: adminId, role: "admin", full_name: "Admin RLS Test" },
    { onConflict: "user_id" },
  );

  // Perfil regular sem role de admin (role = "owner" ou null)
  await service.from("profiles").upsert(
    { user_id: regularId, role: "owner", full_name: "Regular RLS Test" },
    { onConflict: "user_id" },
  );

  // Criar template base via service role para usar nos testes
  const { data: tpl, error: tplErr } = await service
    .from("checklist_templates")
    .insert({
      name: "RLS Write Test Template",
      portaria_ref: "Teste RLS",
      uf: "SP",
      applies_to: ["hospital"],
      version: 1,
      is_active: true,
    })
    .select("id")
    .single();
  if (tplErr) throw new Error(`template: ${tplErr.message}`);

  const { data: sec, error: secErr } = await service
    .from("checklist_template_sections")
    .insert({ template_id: tpl!.id, title: "Seção RLS Test", position: 1 })
    .select("id")
    .single();
  if (secErr) throw new Error(`section: ${secErr.message}`);

  const { data: item, error: itemErr } = await service
    .from("checklist_template_items")
    .insert({
      section_id: sec!.id,
      description: "Item RLS Test original",
      position: 1,
      is_required: false,
      peso: 1,
    })
    .select("id")
    .single();
  if (itemErr) throw new Error(`item: ${itemErr.message}`);

  // Autenticar os dois utilizadores
  const [authAdmin, authRegular] = await Promise.all([
    signInTenant(ADMIN_EMAIL, ADMIN_PASSWORD),
    signInTenant(REGULAR_EMAIL, REGULAR_PASSWORD),
  ]);

  seed = {
    service,
    adminClient: createTenantClient(authAdmin.accessToken),
    regularClient: createTenantClient(authRegular.accessToken),
    adminId,
    regularId,
    templateId: tpl!.id,
    sectionId: sec!.id,
    itemId: item!.id,
  };
}, 60_000);

afterAll(async () => {
  if (!seed) return;
  const { service, templateId } = seed;
  // Cascata apaga sections e items
  await service.from("checklist_templates").delete().eq("id", templateId);
}, 30_000);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function expectWriteBlocked(
  client: SupabaseClient,
  operation: () => Promise<{ error: unknown; data?: unknown[] | null }>,
) {
  const { error, data } = await operation();
  // RLS pode retornar erro explícito ou simplesmente 0 linhas afectadas
  if (error) {
    expect(error).toBeTruthy();
  } else {
    expect((data ?? []) as unknown[]).toHaveLength(0);
  }
}

// ---------------------------------------------------------------------------
// 1. Admin pode escrever em checklist_templates
// ---------------------------------------------------------------------------
describe("RLS admin write: checklist_templates", () => {
  it("admin pode UPDATE em checklist_templates", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_templates")
      .update({ portaria_ref: "Portaria Atualizada RLS" })
      .eq("id", seed.templateId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("utilizador regular NÃO pode UPDATE em checklist_templates", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_templates")
        .update({ portaria_ref: "Hacked" })
        .eq("id", seed.templateId)
        .select("id"),
    );
  });

  it("admin pode INSERT em checklist_templates", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_templates")
      .insert({
        name: "Template Admin Insert Test",
        portaria_ref: "Ref Admin",
        uf: "RJ",
        applies_to: ["escola"],
        version: 1,
        is_active: false,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // Limpar
    if (data) {
      await seed.service.from("checklist_templates").delete().eq("id", data.id);
    }
  });

  it("utilizador regular NÃO pode INSERT em checklist_templates", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_templates")
        .insert({
          name: "Tentativa de inserção por regular",
          portaria_ref: "Hacked",
          uf: "SP",
          applies_to: ["hospital"],
          version: 1,
          is_active: true,
        })
        .select("id"),
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Admin pode escrever em checklist_template_sections
// ---------------------------------------------------------------------------
describe("RLS admin write: checklist_template_sections", () => {
  it("admin pode UPDATE em checklist_template_sections", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_template_sections")
      .update({ title: "Seção Atualizada pelo Admin" })
      .eq("id", seed.sectionId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("utilizador regular NÃO pode UPDATE em checklist_template_sections", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_template_sections")
        .update({ title: "Hacked" })
        .eq("id", seed.sectionId)
        .select("id"),
    );
  });

  it("admin pode INSERT em checklist_template_sections", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_template_sections")
      .insert({
        template_id: seed.templateId,
        title: "Nova Seção pelo Admin",
        position: 99,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    if (data) {
      await seed.service
        .from("checklist_template_sections")
        .delete()
        .eq("id", data.id);
    }
  });

  it("utilizador regular NÃO pode INSERT em checklist_template_sections", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_template_sections")
        .insert({
          template_id: seed.templateId,
          title: "Injecção por regular",
          position: 99,
        })
        .select("id"),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Admin pode escrever em checklist_template_items
// ---------------------------------------------------------------------------
describe("RLS admin write: checklist_template_items", () => {
  it("admin pode UPDATE descrição de checklist_template_items", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_template_items")
      .update({ description: "Descrição atualizada pelo admin" })
      .eq("id", seed.itemId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("a descrição foi efetivamente persistida no banco", async () => {
    const { data } = await seed.service
      .from("checklist_template_items")
      .select("description")
      .eq("id", seed.itemId)
      .single();

    expect(data?.description).toBe("Descrição atualizada pelo admin");
  });

  it("utilizador regular NÃO pode UPDATE em checklist_template_items", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_template_items")
        .update({ description: "Hacked" })
        .eq("id", seed.itemId)
        .select("id"),
    );
  });

  it("admin pode INSERT em checklist_template_items", async () => {
    const { data, error } = await seed.adminClient
      .from("checklist_template_items")
      .insert({
        section_id: seed.sectionId,
        description: "Item inserido pelo admin",
        position: 99,
        is_required: false,
        peso: 1,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    if (data) {
      await seed.service
        .from("checklist_template_items")
        .delete()
        .eq("id", data.id);
    }
  });

  it("utilizador regular NÃO pode INSERT em checklist_template_items", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_template_items")
        .insert({
          section_id: seed.sectionId,
          description: "Injecção por regular",
          position: 88,
          is_required: false,
          peso: 1,
        })
        .select("id"),
    );
  });

  it("admin pode DELETE em checklist_template_items", async () => {
    // Criar item para deletar
    const { data: toDelete } = await seed.service
      .from("checklist_template_items")
      .insert({
        section_id: seed.sectionId,
        description: "Item para deletar",
        position: 77,
        is_required: false,
        peso: 1,
      })
      .select("id")
      .single();

    const { data, error } = await seed.adminClient
      .from("checklist_template_items")
      .delete()
      .eq("id", toDelete!.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("utilizador regular NÃO pode DELETE em checklist_template_items", async () => {
    await expectWriteBlocked(seed.regularClient, () =>
      seed.regularClient
        .from("checklist_template_items")
        .delete()
        .eq("id", seed.itemId)
        .select("id"),
    );

    // Confirmar que o item ainda existe
    const { data } = await seed.service
      .from("checklist_template_items")
      .select("id")
      .eq("id", seed.itemId);
    expect(data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Função is_admin_user()
// ---------------------------------------------------------------------------
describe("RLS: função is_admin_user()", () => {
  it("retorna true para utilizador com role admin", async () => {
    const { data, error } = await seed.adminClient.rpc("is_admin_user");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("retorna false para utilizador sem role admin", async () => {
    const { data, error } = await seed.regularClient.rpc("is_admin_user");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
