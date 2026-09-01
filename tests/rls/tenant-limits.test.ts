/**
 * T1 — tenant_limits: criação automática, backfill e RLS.
 * Plano: docs/plano-limites-tenant-e-billing.md §4.2
 *
 * Pré-requisito: npx supabase start + .env.test
 * Execução: npm run test:rls
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "./helpers/supabase";
import { setupSeed, teardownSeed, type SeedData } from "./fixtures/seed";

let seed: SeedData;
let clientA: SupabaseClient;
let clientB: SupabaseClient;
let service: SupabaseClient;

beforeAll(async () => {
  seed = await setupSeed();
  clientA = seed.clientA;
  clientB = seed.clientB;
  service = createServiceClient();
}, 60_000);

afterAll(async () => {
  await teardownSeed(seed);
}, 30_000);

describe("tenant_limits — criação automática", () => {
  it("todo profile tem uma linha de limites (trigger em profiles)", async () => {
    const { data, error } = await service
      .from("tenant_limits")
      .select("tenant_user_id")
      .eq("tenant_user_id", seed.tenantAId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.tenant_user_id).toBe(seed.tenantAId);
  });

  it("nenhum profile fica sem limites", async () => {
    const { count: profiles } = await service
      .from("profiles")
      .select("user_id", { count: "exact", head: true });
    const { count: limites } = await service
      .from("tenant_limits")
      .select("tenant_user_id", { count: "exact", head: true });

    expect(limites).toBe(profiles);
  });
});

describe("tenant_limits — RLS", () => {
  it("o tenant lê os próprios limites", async () => {
    const { data, error } = await clientA
      .from("tenant_limits")
      .select("clients_limit, patients_limit, team_members_enabled")
      .eq("tenant_user_id", seed.tenantAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("o tenant NÃO lê os limites de outro tenant", async () => {
    const { data } = await clientB
      .from("tenant_limits")
      .select("tenant_user_id")
      .eq("tenant_user_id", seed.tenantAId);

    expect(data ?? []).toHaveLength(0);
  });

  it("o tenant NÃO consegue alterar os próprios limites", async () => {
    const { data, error } = await clientA
      .from("tenant_limits")
      .update({ clients_limit: 9999, clients_limit_enabled: false })
      .eq("tenant_user_id", seed.tenantAId)
      .select("tenant_user_id");

    // RLS devolve erro explícito OU zero linhas afetadas
    if (!error) expect((data ?? []).length).toBe(0);

    const { data: depois } = await service
      .from("tenant_limits")
      .select("clients_limit")
      .eq("tenant_user_id", seed.tenantAId)
      .single();
    expect(depois?.clients_limit).not.toBe(9999);
  });

  it("o tenant NÃO consegue inserir uma linha de limites", async () => {
    const { error } = await clientA
      .from("tenant_limits")
      .insert({ tenant_user_id: seed.tenantBId, clients_limit: 9999 });

    expect(error).toBeTruthy();
  });
});

describe("tenant_limits — restrições de domínio", () => {
  it("limite negativo é rejeitado", async () => {
    const { error } = await service
      .from("tenant_limits")
      .update({ clients_limit: -1 })
      .eq("tenant_user_id", seed.tenantAId);

    expect(error).toBeTruthy();
  });

  it("apagar o profile leva junto a linha de limites (cascade)", async () => {
    const { data: novo } = await service.auth.admin.createUser({
      email: `limits_cascade_${Date.now()}@nutrigestao.test`,
      password: "LimitsCascade@2026!",
      email_confirm: true,
    });
    const uid = novo.user!.id;

    await service
      .from("profiles")
      .upsert({ user_id: uid, full_name: "Cascade" }, { onConflict: "user_id" });

    const { data: criado } = await service
      .from("tenant_limits")
      .select("tenant_user_id")
      .eq("tenant_user_id", uid)
      .maybeSingle();
    expect(criado?.tenant_user_id).toBe(uid);

    await service.auth.admin.deleteUser(uid);

    const { data: depois } = await service
      .from("tenant_limits")
      .select("tenant_user_id")
      .eq("tenant_user_id", uid)
      .maybeSingle();
    expect(depois).toBeNull();
  });
});
