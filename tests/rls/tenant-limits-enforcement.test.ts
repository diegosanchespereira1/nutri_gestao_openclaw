/**
 * T2 — Trigger de aplicação dos limites por tenant.
 * Plano: docs/plano-limites-tenant-e-billing.md §5.1
 *
 * Pré-requisito: npx supabase start + .env.test
 * Execução: npm run test:rls
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "./helpers/supabase";
import { setupSeed, teardownSeed, type SeedData } from "./fixtures/seed";

let seed: SeedData;
let service: SupabaseClient;
let tenant: string;

beforeAll(async () => {
  seed = await setupSeed();
  service = createServiceClient();
  tenant = seed.tenantAId;
}, 60_000);

afterAll(async () => {
  await teardownSeed(seed);
}, 30_000);

/** Deixa o tenant com um limite conhecido antes de cada cenário. */
async function setLimits(patch: Record<string, unknown>) {
  const { error } = await service
    .from("tenant_limits")
    .update(patch)
    .eq("tenant_user_id", tenant);
  expect(error).toBeNull();
}

async function countClients() {
  const { count } = await service
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", tenant);
  return count ?? 0;
}

async function insertClient(nome: string) {
  return service
    .from("clients")
    .insert({ owner_user_id: tenant, kind: "pf", legal_name: nome })
    .select("id")
    .maybeSingle();
}

beforeEach(async () => {
  await setLimits({
    clients_limit_enabled: false,
    patients_limit_enabled: false,
    team_members_enabled: true,
    team_members_unlimited: true,
  });
});

describe("limite de clientes", () => {
  it("desabilitado: insere acima de qualquer número", async () => {
    await setLimits({ clients_limit_enabled: false, clients_limit: 0 });
    const { data, error } = await insertClient(`Sem limite ${Date.now()}`);
    expect(error).toBeNull();
    if (data?.id) await service.from("clients").delete().eq("id", data.id);
  });

  it("abaixo do limite: permite", async () => {
    await setLimits({ clients_limit_enabled: true, clients_limit: (await countClients()) + 1 });
    const { data, error } = await insertClient(`Abaixo ${Date.now()}`);
    expect(error).toBeNull();
    if (data?.id) await service.from("clients").delete().eq("id", data.id);
  });

  it("no limite: bloqueia com LIMITE_CLIENTES_ATINGIDO", async () => {
    await setLimits({ clients_limit_enabled: true, clients_limit: await countClients() });
    const { error } = await insertClient(`No limite ${Date.now()}`);
    expect(error?.message ?? "").toContain("LIMITE_CLIENTES_ATINGIDO");
  });

  it("o bloqueio vale também para service_role", async () => {
    await setLimits({ clients_limit_enabled: true, clients_limit: 0 });
    const { error } = await insertClient(`Service role ${Date.now()}`);
    expect(error).toBeTruthy();
  });

  it("apagar um cliente libera a vaga", async () => {
    // Cria um descartável com folga
    await setLimits({ clients_limit_enabled: true, clients_limit: (await countClients()) + 1 });
    const { data: descartavel, error: criou } = await insertClient(`Descartavel ${Date.now()}`);
    expect(criou).toBeNull();

    // Agora o tenant está exatamente no limite
    await setLimits({ clients_limit: await countClients() });
    const { error: bloqueado } = await insertClient(`Bloqueado ${Date.now()}`);
    expect(bloqueado?.message ?? "").toContain("LIMITE_CLIENTES_ATINGIDO");

    // Apagar libera a vaga, sem mexer no limite
    await service.from("clients").delete().eq("id", descartavel!.id);
    const { data: novo, error: liberou } = await insertClient(`Depois ${Date.now()}`);
    expect(liberou).toBeNull();
    if (novo?.id) await service.from("clients").delete().eq("id", novo.id);
  });
});

describe("limite de pacientes", () => {
  it("no limite: bloqueia com LIMITE_PACIENTES_ATINGIDO", async () => {
    const { count } = await service
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", tenant);

    await setLimits({ patients_limit_enabled: true, patients_limit: count ?? 0 });

    const { error } = await service
      .from("patients")
      .insert({ user_id: tenant, full_name: `Paciente ${Date.now()}` });

    expect(error?.message ?? "").toContain("LIMITE_PACIENTES_ATINGIDO");
  });

  it("limites de clientes e pacientes são independentes", async () => {
    await setLimits({
      clients_limit_enabled: true,
      clients_limit: 0,
      patients_limit_enabled: false,
    });

    const { error: cliente } = await insertClient(`Bloqueia ${Date.now()}`);
    expect(cliente).toBeTruthy();

    const { data: paciente, error: pac } = await service
      .from("patients")
      .insert({ user_id: tenant, full_name: `Livre ${Date.now()}` })
      .select("id")
      .maybeSingle();
    expect(pac).toBeNull();
    if (paciente?.id) await service.from("patients").delete().eq("id", paciente.id);
  });
});

describe("membros de equipe", () => {
  async function insertMember(nome: string, ativo = true) {
    return service
      .from("team_members")
      .insert({
        owner_user_id: tenant,
        full_name: nome,
        professional_area: "nutrition",
        job_role: "nutricionista",
        is_active: ativo,
      })
      .select("id")
      .maybeSingle();
  }

  it("equipe desabilitada: bloqueia com EQUIPE_DESABILITADA", async () => {
    await setLimits({ team_members_enabled: false });
    const { error } = await insertMember(`Membro ${Date.now()}`);
    expect(error?.message ?? "").toContain("EQUIPE_DESABILITADA");
  });

  it("ilimitado: permite", async () => {
    await setLimits({ team_members_enabled: true, team_members_unlimited: true });
    const { data, error } = await insertMember(`Ilimitado ${Date.now()}`);
    expect(error).toBeNull();
    if (data?.id) await service.from("team_members").delete().eq("id", data.id);
  });

  it("no limite: bloqueia com LIMITE_EQUIPE_ATINGIDO", async () => {
    const { count } = await service
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenant)
      .eq("is_active", true);

    await setLimits({
      team_members_enabled: true,
      team_members_unlimited: false,
      team_members_limit: count ?? 0,
    });

    const { error } = await insertMember(`No limite ${Date.now()}`);
    expect(error?.message ?? "").toContain("LIMITE_EQUIPE_ATINGIDO");
  });

  it("membro INATIVO não ocupa assento", async () => {
    const { count } = await service
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenant)
      .eq("is_active", true);

    await setLimits({
      team_members_enabled: true,
      team_members_unlimited: false,
      team_members_limit: count ?? 0,
    });

    const { data, error } = await insertMember(`Inativo ${Date.now()}`, false);
    expect(error).toBeNull();
    if (data?.id) await service.from("team_members").delete().eq("id", data.id);
  });

  it("REATIVAR sem assento livre é bloqueado — a brecha do desativa/reativa", async () => {
    await setLimits({
      team_members_enabled: true,
      team_members_unlimited: true,
    });
    const { data: membro } = await insertMember(`Reativavel ${Date.now()}`, false);
    expect(membro?.id).toBeTruthy();

    const { count } = await service
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenant)
      .eq("is_active", true);

    await setLimits({
      team_members_unlimited: false,
      team_members_limit: count ?? 0,
    });

    const { error } = await service
      .from("team_members")
      .update({ is_active: true })
      .eq("id", membro!.id);

    expect(error?.message ?? "").toContain("LIMITE_EQUIPE_ATINGIDO");

    await setLimits({ team_members_unlimited: true });
    await service.from("team_members").delete().eq("id", membro!.id);
  });
});
