/**
 * Popula dados genéricos de demonstração para o tenant 4 na base DEV.
 * Idempotente: não duplica se já existir cliente marcador "[Demo]".
 *
 * Uso: node scripts/database/seed-tenant4-demo-dev.mjs
 * Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (DEV).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

if (!url.includes("dbhmlnutricao.stratostech.com.br")) {
  console.error("Abortado: este script só pode rodar na base DEV (dbhmlnutricao).");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const TENANT4_OWNER_USER_ID = "7454b097-225e-411b-8442-d8d5bfb4a7a2";
const DEMO_TEAM_MEMBER_ID = "3a352fbe-c1fc-4ad1-b2f5-5598a1804913";
const DEMO_MARKER = "[Demo]";

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  const { data: marker } = await sb
    .from("clients")
    .select("id")
    .eq("owner_user_id", TENANT4_OWNER_USER_ID)
    .eq("legal_name", `${DEMO_MARKER} Escola Sol Nascente`)
    .maybeSingle();

  if (marker) {
    console.log("Dados demo do tenant 4 já existem — nada a fazer.");
    return;
  }

  const { data: existingHotel } = await sb
    .from("clients")
    .select("id")
    .eq("owner_user_id", TENANT4_OWNER_USER_ID)
    .eq("id", "50d2e56b-275b-4bc5-9f62-aa7b7c6c0656")
    .maybeSingle();

  let hotelClientId = existingHotel?.id;

  if (hotelClientId) {
    await sb
      .from("clients")
      .update({
        legal_name: "Hotel Aurora Ltda",
        trade_name: `${DEMO_MARKER} Hotel Aurora`,
        business_segment: "hotel",
        email: "contato@hotelaurora-demo.com.br",
        phone: "551130001000",
        notes: "Cliente de demonstração — assessoria em serviços de alimentação.",
        lifecycle_status: "ativo",
        activated_at: new Date().toISOString().slice(0, 10),
      })
      .eq("id", hotelClientId);

    await sb
      .from("establishments")
      .update({
        name: `${DEMO_MARKER} Hotel Aurora — Unidade Centro`,
        establishment_type: "hotel",
        address_line1: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        postal_code: "01310-100",
      })
      .eq("client_id", hotelClientId);
  }

  const { data: hotelEst } = await sb
    .from("establishments")
    .select("id")
    .eq("client_id", hotelClientId)
    .maybeSingle();

  const hotelEstablishmentId = hotelEst?.id;
  if (!hotelClientId || !hotelEstablishmentId) {
    throw new Error("Cliente/estabelecimento hotel do tenant 4 não encontrado.");
  }

  const { data: pfClient, error: pfErr } = await sb
    .from("clients")
    .insert({
      owner_user_id: TENANT4_OWNER_USER_ID,
      kind: "pf",
      legal_name: `${DEMO_MARKER} Ana Paula Ferreira`,
      document_id: "52998224725",
      email: "ana.ferreira@demo.com",
      phone: "5511987654321",
      lifecycle_status: "ativo",
      notes: "Paciente de consultório — módulo atendimento nutricional.",
    })
    .select("id")
    .single();
  if (pfErr) throw pfErr;

  const { data: schoolClient, error: schoolErr } = await sb
    .from("clients")
    .insert({
      owner_user_id: TENANT4_OWNER_USER_ID,
      kind: "pj",
      legal_name: `${DEMO_MARKER} Escola Sol Nascente`,
      trade_name: "Escola Sol Nascente",
      business_segment: "escola",
      email: "nutricao@escolasolnascente-demo.com.br",
      phone: "551140002000",
      lifecycle_status: "ativo",
      activated_at: new Date().toISOString().slice(0, 10),
      notes: "Cliente PJ de demonstração — merenda escolar.",
    })
    .select("id")
    .single();
  if (schoolErr) throw schoolErr;

  const { data: schoolEst, error: schoolEstErr } = await sb
    .from("establishments")
    .insert({
      client_id: schoolClient.id,
      name: `${DEMO_MARKER} Unidade Jardim das Flores`,
      establishment_type: "escola",
      address_line1: "Rua das Acácias, 250",
      city: "São Paulo",
      state: "SP",
      postal_code: "04567-000",
    })
    .select("id")
    .single();
  if (schoolEstErr) throw schoolEstErr;

  const { data: patients, error: patientsErr } = await sb
    .from("patients")
    .insert([
      {
        user_id: TENANT4_OWNER_USER_ID,
        client_id: pfClient.id,
        full_name: "Ana Paula Ferreira",
        birth_date: "1988-03-15",
        sex: "female",
        phone: "5511987654321",
        email: "ana.ferreira@demo.com",
        notes: "Acompanhamento nutricional para reeducação alimentar.",
      },
      {
        user_id: TENANT4_OWNER_USER_ID,
        client_id: pfClient.id,
        full_name: "Lucas Ferreira",
        birth_date: "2014-07-22",
        sex: "male",
        notes: "Filho da paciente — avaliação infantil.",
      },
    ])
    .select("id, full_name");
  if (patientsErr) throw patientsErr;

  const anaPatient = patients.find((p) => p.full_name === "Ana Paula Ferreira");

  const { error: contractErr } = await sb.from("client_contracts").insert({
    owner_user_id: TENANT4_OWNER_USER_ID,
    client_id: hotelClientId,
    billing_recurrence: "monthly",
    monthly_amount_cents: 350000,
    contract_start_date: "2026-01-01",
    contract_end_date: "2026-12-31",
    alert_days_before: 30,
    notes: "Contrato mensal de assessoria — ambiente demo.",
  });
  if (contractErr) throw contractErr;

  const { error: visitsErr } = await sb.from("scheduled_visits").insert([
    {
      user_id: TENANT4_OWNER_USER_ID,
      target_type: "establishment",
      establishment_id: hotelEstablishmentId,
      scheduled_start: daysFromNow(3),
      priority: "normal",
      status: "scheduled",
      visit_kind: "technical_compliance",
      assigned_team_member_id: DEMO_TEAM_MEMBER_ID,
      notes: "Visita técnica de rotina — cozinha e áreas de apoio.",
    },
    {
      user_id: TENANT4_OWNER_USER_ID,
      target_type: "patient",
      patient_id: anaPatient.id,
      scheduled_start: daysFromNow(7),
      priority: "normal",
      status: "scheduled",
      visit_kind: "patient_care",
      assigned_team_member_id: DEMO_TEAM_MEMBER_ID,
      notes: "Retorno de consulta nutricional.",
    },
  ]);
  if (visitsErr) throw visitsErr;

  const { data: hotelRecipe, error: hotelRecipeErr } = await sb
    .from("technical_recipes")
    .insert({
      client_id: hotelClientId,
      establishment_id: hotelEstablishmentId,
      contexto: "ESTABELECIMENTO",
      name: `${DEMO_MARKER} Frango grelhado com legumes`,
      status: "published",
      portions_yield: 20,
      margin_percent: 35,
      tax_percent: 0,
    })
    .select("id")
    .single();
  if (hotelRecipeErr) throw hotelRecipeErr;

  const { data: schoolRecipe, error: schoolRecipeErr } = await sb
    .from("technical_recipes")
    .insert({
      client_id: schoolClient.id,
      establishment_id: schoolEst.id,
      contexto: "ESTABELECIMENTO",
      name: `${DEMO_MARKER} Arroz integral com feijão`,
      status: "published",
      portions_yield: 50,
      margin_percent: 20,
      tax_percent: 0,
    })
    .select("id")
    .single();
  if (schoolRecipeErr) throw schoolRecipeErr;

  const { error: linesErr } = await sb.from("technical_recipe_lines").insert([
    {
      recipe_id: hotelRecipe.id,
      sort_order: 1,
      ingredient_name: "Peito de frango",
      quantity: 3000,
      unit: "g",
    },
    {
      recipe_id: hotelRecipe.id,
      sort_order: 2,
      ingredient_name: "Mix de legumes",
      quantity: 1500,
      unit: "g",
    },
    {
      recipe_id: schoolRecipe.id,
      sort_order: 1,
      ingredient_name: "Arroz integral",
      quantity: 5000,
      unit: "g",
    },
    {
      recipe_id: schoolRecipe.id,
      sort_order: 2,
      ingredient_name: "Feijão carioca",
      quantity: 2500,
      unit: "g",
    },
  ]);
  if (linesErr) throw linesErr;

  await sb
    .from("profiles")
    .update({
      tenant_name: "NutriGestão Demo",
      full_name: "NutriGestão Demo",
      crn: "CRN-3 00000/DEMO",
    })
    .eq("user_id", TENANT4_OWNER_USER_ID);

  console.log("Seed demo tenant 4 concluído:");
  console.log("- Hotel atualizado + contrato + receita");
  console.log("- Escola PJ + estabelecimento + receita");
  console.log("- Cliente PF + 2 pacientes");
  console.log("- 2 visitas agendadas");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
