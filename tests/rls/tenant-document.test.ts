/**
 * T6 — Documento fiscal do tenant: unicidade global, grant por coluna,
 * bloqueio de membro de equipe e trilha de auditoria.
 * Plano: docs/plano-limites-tenant-e-billing.md §7
 *
 * Pré-requisito: npx supabase start + .env.test
 * Execução: npm run test:rls
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "./helpers/supabase";
import { setupSeed, teardownSeed, type SeedData } from "./fixtures/seed";

let seed: SeedData;
let service: SupabaseClient;

// CPF/CNPJ válidos, sem colisão com dados de outros testes.
const CNPJ_A = "11222333000181";
const CPF_B = "52998224725";

beforeAll(async () => {
  seed = await setupSeed();
  service = createServiceClient();
}, 60_000);

afterAll(async () => {
  await teardownSeed(seed);
}, 30_000);

async function clearDocuments() {
  await service
    .from("profiles")
    .update({ document_kind: null, document_id: null })
    .in("user_id", [seed.tenantAId, seed.tenantBId]);
}

afterEach(async () => {
  await clearDocuments();
});

async function setDocument(
  client: SupabaseClient,
  userId: string,
  kind: string | null,
  documentId: string | null,
) {
  return client
    .from("profiles")
    .update({ document_kind: kind, document_id: documentId })
    .eq("user_id", userId)
    .select("document_kind, document_id")
    .maybeSingle();
}

describe("documento do tenant — gravação pelo titular", () => {
  it("o titular grava o próprio CNPJ", async () => {
    const { data, error } = await setDocument(
      seed.clientA,
      seed.tenantAId,
      "cnpj",
      CNPJ_A,
    );

    expect(error).toBeNull();
    expect(data).toEqual({ document_kind: "cnpj", document_id: CNPJ_A });
  });

  it("o titular grava CPF — profissional autônomo sem CNPJ", async () => {
    const { error } = await setDocument(
      seed.clientB,
      seed.tenantBId,
      "cpf",
      CPF_B,
    );
    expect(error).toBeNull();
  });

  it("o tenant não escreve no documento de outro tenant", async () => {
    const { data, error } = await setDocument(
      seed.clientA,
      seed.tenantBId,
      "cnpj",
      CNPJ_A,
    );

    // RLS filtra a linha: nada é atualizado (nem erro, nem dado).
    expect(error).toBeNull();
    expect(data).toBeNull();

    const { data: depois } = await service
      .from("profiles")
      .select("document_id")
      .eq("user_id", seed.tenantBId)
      .maybeSingle();
    expect(depois?.document_id).toBeNull();
  });
});

describe("documento do tenant — restrições do banco", () => {
  it("é único na plataforma: outro tenant não repete o mesmo documento", async () => {
    const primeiro = await setDocument(
      seed.clientA,
      seed.tenantAId,
      "cnpj",
      CNPJ_A,
    );
    expect(primeiro.error).toBeNull();

    const segundo = await setDocument(
      seed.clientB,
      seed.tenantBId,
      "cnpj",
      CNPJ_A,
    );
    expect(segundo.error?.code).toBe("23505");
    expect(segundo.error?.message ?? "").toContain("profiles_document_id_uidx");
  });

  it("tipo e número andam juntos: só o número é recusado pelo check", async () => {
    const { error } = await setDocument(
      seed.clientA,
      seed.tenantAId,
      null,
      CNPJ_A,
    );
    expect(error?.message ?? "").toContain("profiles_document_pair_check");
  });

  it("CNPJ com 11 dígitos é recusado pelo formato", async () => {
    const { error } = await setDocument(
      seed.clientA,
      seed.tenantAId,
      "cnpj",
      CPF_B,
    );
    expect(error?.message ?? "").toContain("profiles_document_pair_check");
  });

  it("limpar o documento (par nulo) é permitido", async () => {
    await setDocument(seed.clientA, seed.tenantAId, "cnpj", CNPJ_A);
    const { error } = await setDocument(seed.clientA, seed.tenantAId, null, null);
    expect(error).toBeNull();
  });
});

describe("documento do tenant — membro de equipe", () => {
  it("membro ativo não regista documento no próprio profile", async () => {
    // Cria um profile de membro e vincula-o ao tenant A.
    const memberUserId = crypto.randomUUID();
    await service.from("profiles").insert({
      user_id: memberUserId,
      full_name: "Membro sem documento",
    });
    const { data: membro } = await service
      .from("team_members")
      .insert({
        owner_user_id: seed.tenantAId,
        member_user_id: memberUserId,
        full_name: "Membro sem documento",
        professional_area: "nutrition",
        job_role: "nutricionista",
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    const { error } = await service
      .from("profiles")
      .update({ document_kind: "cnpj", document_id: CNPJ_A })
      .eq("user_id", memberUserId);

    expect(error?.message ?? "").toContain("DOCUMENTO_SOMENTE_TITULAR");

    if (membro?.id) await service.from("team_members").delete().eq("id", membro.id);
    await service.from("profiles").delete().eq("user_id", memberUserId);
  });
});

describe("documento do tenant — trilha de auditoria", () => {
  it("gravar o documento gera subscription_events.tenant_document_set", async () => {
    const antes = await service
      .from("subscription_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_user_id", seed.tenantAId)
      .eq("event_type", "tenant_document_set");

    await setDocument(seed.clientA, seed.tenantAId, "cnpj", CNPJ_A);

    const { data, count } = await service
      .from("subscription_events")
      .select("new_value, metadata", { count: "exact" })
      .eq("tenant_user_id", seed.tenantAId)
      .eq("event_type", "tenant_document_set")
      .order("created_at", { ascending: false })
      .limit(1);

    expect(count).toBe((antes.count ?? 0) + 1);
    expect(data?.[0]?.new_value).toBe(CNPJ_A);
    expect(
      (data?.[0]?.metadata as Record<string, unknown> | null)?.document_kind,
    ).toBe("cnpj");
  });

  it("update que não toca no documento não gera evento novo", async () => {
    await setDocument(seed.clientA, seed.tenantAId, "cnpj", CNPJ_A);

    const antes = await service
      .from("subscription_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_user_id", seed.tenantAId)
      .eq("event_type", "tenant_document_set");

    // Reenvia exatamente os mesmos valores — o guard tem de sair cedo.
    await setDocument(seed.clientA, seed.tenantAId, "cnpj", CNPJ_A);

    const depois = await service
      .from("subscription_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_user_id", seed.tenantAId)
      .eq("event_type", "tenant_document_set");

    expect(depois.count).toBe(antes.count);
  });
});
