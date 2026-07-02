/**
 * Popula checklists de demonstração nos clientes PJ do tenant 4 — DEV.
 *
 * Uso: npx vitest run --config scripts/database/vitest.seed.config.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TENANT4_OWNER_USER_ID = "7454b097-225e-411b-8442-d8d5bfb4a7a2";
const DEMO_MARKER = "[Demo]";
const DEMO_SIGNER = `${DEMO_MARKER} Responsável Técnico`;

const HOTEL_ESTABLISHMENT_ID = "9df53c8d-1d4f-4bdc-aec7-69fefcd6d10d";
const SCHOOL_ESTABLISHMENT_ID = "610d19c7-80e3-420b-a3f4-3453549b0377";

const TEMPLATE_HOTEL_FRIGOBAR = "a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00";
const TEMPLATE_SCHOOL = "bd618d62-2643-53a0-a096-0678f07a2697";

type TemplateItem = {
  id: string;
  is_structure_only: boolean;
  is_required: boolean;
  peso: number;
};

function assertDevUrl() {
  if (!url?.includes("dbhmlnutricao.stratostech.com.br")) {
    throw new Error("Abortado: só pode rodar na base DEV (dbhmlnutricao).");
  }
  if (!url || !serviceKey) {
    throw new Error("Defina SUPABASE URL/keys em .env.local");
  }
}

function isoDaysAgo(days: number, hour = 14): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

async function loadEvaluableItems(
  sb: SupabaseClient,
  templateId: string,
): Promise<TemplateItem[]> {
  const { data: sections, error: secErr } = await sb
    .from("checklist_template_sections")
    .select("id")
    .eq("template_id", templateId);
  if (secErr) throw secErr;

  const sectionIds = (sections ?? []).map((s) => s.id);
  if (sectionIds.length === 0) return [];

  const { data: items, error: itemErr } = await sb
    .from("checklist_template_items")
    .select("id, is_structure_only, is_required, peso")
    .in("section_id", sectionIds);
  if (itemErr) throw itemErr;

  return (items ?? []).filter((item) => !item.is_structure_only) as TemplateItem[];
}

function buildOutcomes(
  items: TemplateItem[],
  targetScorePercent: number,
): Record<string, "conforme" | "nc" | "na"> {
  const required = items.filter((item) => item.is_required);
  const optional = items.filter((item) => !item.is_required);
  const ncCount = Math.round(required.length * (1 - targetScorePercent / 100));
  const outcomes: Record<string, "conforme" | "nc" | "na"> = {};

  required.forEach((item, index) => {
    outcomes[item.id] = index < required.length - ncCount ? "conforme" : "nc";
  });
  optional.forEach((item) => {
    outcomes[item.id] = "na";
  });

  return outcomes;
}

async function createApprovedChecklistSession(input: {
  sb: SupabaseClient;
  establishmentId: string;
  templateId: string;
  items: TemplateItem[];
  targetScorePercent: number;
  recordedAt: string;
  clinicalNote?: string;
}): Promise<string> {
  const {
    sb,
    establishmentId,
    templateId,
    items,
    targetScorePercent,
    recordedAt,
    clinicalNote,
  } = input;

  const { data: session, error: sessionErr } = await sb
    .from("checklist_fill_sessions")
    .insert({
      user_id: TENANT4_OWNER_USER_ID,
      establishment_id: establishmentId,
      template_id: templateId,
      created_at: recordedAt,
      updated_at: recordedAt,
    })
    .select("id")
    .single();
  if (sessionErr || !session) throw sessionErr ?? new Error("Sessão não criada");

  const outcomes = buildOutcomes(items, targetScorePercent);
  const responses = Object.entries(outcomes).map(([template_item_id, outcome]) => ({
    session_id: session.id,
    template_item_id,
    outcome,
    note:
      outcome === "nc"
        ? `${DEMO_MARKER} Não conformidade registrada para demonstração.`
        : null,
    item_annotation:
      outcome === "nc" && clinicalNote ? clinicalNote : null,
    created_at: recordedAt,
    updated_at: recordedAt,
  }));

  const { error: responseErr } = await sb
    .from("checklist_fill_item_responses")
    .insert(responses);
  if (responseErr) throw responseErr;

  const { error: scoreErr } = await sb.rpc("calculate_and_store_session_score", {
    p_session_id: session.id,
  });
  if (scoreErr) throw scoreErr;

  const { error: approveErr } = await sb
    .from("checklist_fill_sessions")
    .update({
      dossier_approved_at: recordedAt,
      client_signer_name: DEMO_SIGNER,
      updated_at: recordedAt,
    })
    .eq("id", session.id);
  if (approveErr) throw approveErr;

  return session.id;
}

describe("seed tenant4 checklists (DEV)", () => {
  it("insere checklists aprovados nos estabelecimentos demo", async () => {
    assertDevUrl();
    const sb = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });

    const { data: existing } = await sb
      .from("checklist_fill_sessions")
      .select("id")
      .eq("client_signer_name", DEMO_SIGNER)
      .limit(1);
    if (existing?.length) return;

    const [hotelItems, schoolItems] = await Promise.all([
      loadEvaluableItems(sb, TEMPLATE_HOTEL_FRIGOBAR),
      loadEvaluableItems(sb, TEMPLATE_SCHOOL),
    ]);
    expect(hotelItems.length).toBeGreaterThan(0);
    expect(schoolItems.length).toBeGreaterThan(0);

    const sessionIds = await Promise.all([
      createApprovedChecklistSession({
        sb,
        establishmentId: HOTEL_ESTABLISHMENT_ID,
        templateId: TEMPLATE_HOTEL_FRIGOBAR,
        items: hotelItems,
        targetScorePercent: 86,
        recordedAt: isoDaysAgo(120),
        clinicalNote: "Revisar temperatura do frigobar.",
      }),
      createApprovedChecklistSession({
        sb,
        establishmentId: HOTEL_ESTABLISHMENT_ID,
        templateId: TEMPLATE_HOTEL_FRIGOBAR,
        items: hotelItems,
        targetScorePercent: 94,
        recordedAt: isoDaysAgo(45),
      }),
      createApprovedChecklistSession({
        sb,
        establishmentId: SCHOOL_ESTABLISHMENT_ID,
        templateId: TEMPLATE_SCHOOL,
        items: schoolItems,
        targetScorePercent: 82,
        recordedAt: isoDaysAgo(100),
        clinicalNote: "Ajustar rotulagem da despensa.",
      }),
      createApprovedChecklistSession({
        sb,
        establishmentId: SCHOOL_ESTABLISHMENT_ID,
        templateId: TEMPLATE_SCHOOL,
        items: schoolItems,
        targetScorePercent: 91,
        recordedAt: isoDaysAgo(25),
      }),
    ]);

    // Rascunho em andamento no hotel (sem aprovação) para variar o histórico.
    const draftOutcomes = buildOutcomes(hotelItems, 70);
    const draftAt = isoDaysAgo(3, 9);
    const { data: draftSession, error: draftErr } = await sb
      .from("checklist_fill_sessions")
      .insert({
        user_id: TENANT4_OWNER_USER_ID,
        establishment_id: HOTEL_ESTABLISHMENT_ID,
        template_id: TEMPLATE_HOTEL_FRIGOBAR,
        created_at: draftAt,
        updated_at: draftAt,
      })
      .select("id")
      .single();
    if (draftErr || !draftSession) throw draftErr ?? new Error("Rascunho não criado");

    const partialItems = Object.entries(draftOutcomes).slice(
      0,
      Math.ceil(Object.keys(draftOutcomes).length * 0.55),
    );
    const { error: partialErr } = await sb.from("checklist_fill_item_responses").insert(
      partialItems.map(([template_item_id, outcome]) => ({
        session_id: draftSession.id,
        template_item_id,
        outcome,
        created_at: draftAt,
        updated_at: draftAt,
      })),
    );
    if (partialErr) throw partialErr;

    expect(sessionIds).toHaveLength(4);
    expect(draftSession.id).toBeTruthy();
  }, 120_000);
});
