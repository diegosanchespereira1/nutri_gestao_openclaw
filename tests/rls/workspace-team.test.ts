/**
 * RLS same-workspace: permissões da equipe (UPDATE membros, DELETE só gestão,
 * membro inativo fora de workspace_member_user_ids).
 *
 * Migrations: 20260830210000, 20260830220000, 20260831120000
 *
 * Pré-requisito: npx supabase start + .env.test
 * Execução: npm run test:rls
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceClient,
  createTenantClient,
  signInTenant,
} from "./helpers/supabase";

const OWNER_EMAIL = "owner_rls_team@nutrigestao.test";
const OWNER_PASSWORD = "RlsTest@OwnerTeam2026!";
const NUTRI_EMAIL = "nutri_rls_team@nutrigestao.test";
const NUTRI_PASSWORD = "RlsTest@NutriTeam2026!";
const GESTAO_EMAIL = "gestao_rls_team@nutrigestao.test";
const GESTAO_PASSWORD = "RlsTest@GestaoTeam2026!";
const INACTIVE_EMAIL = "inactive_rls_team@nutrigestao.test";
const INACTIVE_PASSWORD = "RlsTest@InactiveTeam2026!";

type TeamSeed = {
  service: SupabaseClient;
  ownerId: string;
  nutriId: string;
  gestaoId: string;
  inactiveId: string;
  ownerClient: SupabaseClient;
  nutriClient: SupabaseClient;
  gestaoClient: SupabaseClient;
  inactiveClient: SupabaseClient;
  clientId: string;
  patientId: string;
  disposableClientId: string;
  teamMemberIds: string[];
};

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

  // Garantir que consegue autenticar (desban se necessário).
  await service.auth.admin.updateUserById(found.id, {
    password,
    ban_duration: "none",
  });
  return found.id;
}

let seed: TeamSeed;

beforeAll(async () => {
  const service = createServiceClient();

  const [ownerId, nutriId, gestaoId, inactiveId] = await Promise.all([
    ensureUser(service, OWNER_EMAIL, OWNER_PASSWORD),
    ensureUser(service, NUTRI_EMAIL, NUTRI_PASSWORD),
    ensureUser(service, GESTAO_EMAIL, GESTAO_PASSWORD),
    ensureUser(service, INACTIVE_EMAIL, INACTIVE_PASSWORD),
  ]);

  await Promise.all([
    service.from("profiles").upsert(
      { user_id: ownerId, role: "owner", full_name: "Owner Team RLS" },
      { onConflict: "user_id" },
    ),
    service.from("profiles").upsert(
      { user_id: nutriId, role: "user", full_name: "Nutri Team RLS" },
      { onConflict: "user_id" },
    ),
    service.from("profiles").upsert(
      { user_id: gestaoId, role: "user", full_name: "Gestao Team RLS" },
      { onConflict: "user_id" },
    ),
    service.from("profiles").upsert(
      { user_id: inactiveId, role: "user", full_name: "Inactive Team RLS" },
      { onConflict: "user_id" },
    ),
  ]);

  // Limpar vínculos anteriores deste owner de testes.
  await service.from("team_members").delete().eq("owner_user_id", ownerId);
  await service.from("patients").delete().eq("user_id", ownerId);
  await service
    .from("establishments")
    .delete()
    .in(
      "client_id",
      (
        await service
          .from("clients")
          .select("id")
          .eq("owner_user_id", ownerId)
      ).data?.map((r) => r.id) ?? [],
    );
  await service.from("clients").delete().eq("owner_user_id", ownerId);

  const { data: clientRow, error: clientErr } = await service
    .from("clients")
    .insert({
      owner_user_id: ownerId,
      kind: "pj",
      legal_name: "RLS_TEAM Cliente",
      email: "client_team@rls.test",
    })
    .select("id")
    .single();
  if (clientErr) throw new Error(`clients: ${clientErr.message}`);

  const { data: estRow, error: estErr } = await service
    .from("establishments")
    .insert({
      client_id: clientRow!.id,
      name: "RLS_TEAM Estabelecimento",
      establishment_type: "hospital",
    })
    .select("id")
    .single();
  if (estErr) throw new Error(`establishments: ${estErr.message}`);

  const { data: patientRow, error: patErr } = await service
    .from("patients")
    .insert({
      user_id: ownerId,
      client_id: clientRow!.id,
      establishment_id: estRow!.id,
      full_name: "RLS_TEAM Paciente",
      birth_date: "1990-01-01",
    })
    .select("id")
    .single();
  if (patErr) throw new Error(`patients: ${patErr.message}`);

  const { data: disposable, error: dispErr } = await service
    .from("clients")
    .insert({
      owner_user_id: ownerId,
      kind: "pf",
      legal_name: "RLS_TEAM Cliente Descartavel",
      email: "disposable_team@rls.test",
    })
    .select("id")
    .single();
  if (dispErr) throw new Error(`disposable client: ${dispErr.message}`);

  const members = [
    {
      owner_user_id: ownerId,
      member_user_id: nutriId,
      full_name: "Nutri Team RLS",
      email: NUTRI_EMAIL,
      job_role: "nutricionista",
      is_active: true,
    },
    {
      owner_user_id: ownerId,
      member_user_id: gestaoId,
      full_name: "Gestao Team RLS",
      email: GESTAO_EMAIL,
      job_role: "gestao",
      is_active: true,
    },
    {
      owner_user_id: ownerId,
      member_user_id: inactiveId,
      full_name: "Inactive Team RLS",
      email: INACTIVE_EMAIL,
      job_role: "nutricionista",
      is_active: false,
    },
  ];

  const { data: tmRows, error: tmErr } = await service
    .from("team_members")
    .insert(members)
    .select("id");
  if (tmErr) throw new Error(`team_members: ${tmErr.message}`);

  const [authOwner, authNutri, authGestao, authInactive] = await Promise.all([
    signInTenant(OWNER_EMAIL, OWNER_PASSWORD),
    signInTenant(NUTRI_EMAIL, NUTRI_PASSWORD),
    signInTenant(GESTAO_EMAIL, GESTAO_PASSWORD),
    signInTenant(INACTIVE_EMAIL, INACTIVE_PASSWORD),
  ]);

  seed = {
    service,
    ownerId,
    nutriId,
    gestaoId,
    inactiveId,
    ownerClient: createTenantClient(authOwner.accessToken),
    nutriClient: createTenantClient(authNutri.accessToken),
    gestaoClient: createTenantClient(authGestao.accessToken),
    inactiveClient: createTenantClient(authInactive.accessToken),
    clientId: clientRow!.id,
    patientId: patientRow!.id,
    disposableClientId: disposable!.id,
    teamMemberIds: (tmRows ?? []).map((r) => r.id),
  };
}, 60_000);

afterAll(async () => {
  if (!seed) return;
  const { service, ownerId, clientId, disposableClientId, teamMemberIds } = seed;

  await service.from("team_members").delete().in("id", teamMemberIds);
  await service.from("patients").delete().eq("user_id", ownerId);
  await service.from("establishments").delete().eq("client_id", clientId);
  await service
    .from("clients")
    .delete()
    .in("id", [clientId, disposableClientId]);
}, 30_000);

describe("RLS same-workspace: equipe", () => {
  it("membro ativo (nutri) atualiza client do workspace", async () => {
    const marker = `Atualizado por nutri ${Date.now()}`;
    const { data, error } = await seed.nutriClient
      .from("clients")
      .update({ legal_name: marker })
      .eq("id", seed.clientId)
      .select("id, legal_name");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.legal_name).toBe(marker);
  });

  it("membro ativo (nutri) atualiza patient do workspace", async () => {
    const marker = `Paciente nutri ${Date.now()}`;
    const { data, error } = await seed.nutriClient
      .from("patients")
      .update({ full_name: marker })
      .eq("id", seed.patientId)
      .select("id, full_name");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.full_name).toBe(marker);
  });

  it("membro nutri NÃO apaga client do workspace", async () => {
    const { data } = await seed.nutriClient
      .from("clients")
      .delete()
      .eq("id", seed.disposableClientId)
      .select("id");

    expect(data).toHaveLength(0);

    const { data: stillThere } = await seed.service
      .from("clients")
      .select("id")
      .eq("id", seed.disposableClientId);
    expect(stillThere).toHaveLength(1);
  });

  it("membro gestão apaga client descartável do workspace", async () => {
    const { data, error } = await seed.gestaoClient
      .from("clients")
      .delete()
      .eq("id", seed.disposableClientId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    // Recria para teardown estável / reexecução.
    const { data: recreated, error: recreateErr } = await seed.service
      .from("clients")
      .insert({
        owner_user_id: seed.ownerId,
        kind: "pf",
        legal_name: "RLS_TEAM Cliente Descartavel",
        email: "disposable_team@rls.test",
      })
      .select("id")
      .single();
    if (recreateErr) throw new Error(`recreate disposable: ${recreateErr.message}`);
    seed.disposableClientId = recreated!.id;
  });

  it("membro inativo não vê client do workspace", async () => {
    const { data, error } = await seed.inactiveClient
      .from("clients")
      .select("id")
      .eq("id", seed.clientId);

    if (error) {
      expect(error.code).toMatch(/PGRST301|42501|insufficient_privilege/);
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it("membro inativo não atualiza client do workspace", async () => {
    const { data } = await seed.inactiveClient
      .from("clients")
      .update({ legal_name: "Hacked by inactive" })
      .eq("id", seed.clientId)
      .select("id");

    expect(data).toHaveLength(0);
  });
});
