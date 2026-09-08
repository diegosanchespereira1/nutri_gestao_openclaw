"use server";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { todayKey } from "@/lib/datetime/calendar-tz";
import {
  buildSchoolNutritionOverview,
  normalizeChildResults,
  parseCivilDate,
  parseSchoolOverviewSerieParam,
  type SchoolNutritionOverview,
  type SchoolOverviewGrade,
  type SchoolOverviewPatient,
} from "@/lib/nutrition/child/school-overview";

const ASSESSMENT_IN_CHUNK = 100;

export type SchoolNutritionOverviewLoad =
  | { ok: false; reason: "unauthenticated" | "not_found" | "not_school" }
  | {
      ok: true;
      clientId: string;
      clientName: string;
      patientsHref: string | null;
      overview: SchoolNutritionOverview;
      professionalName: string;
    };

type ClientRow = {
  id: string;
  owner_user_id: string;
  kind: string;
  business_segment: string | null;
  legal_name: string;
  trade_name: string | null;
};

function clientDisplayName(row: ClientRow): string {
  const trade = row.trade_name?.trim();
  return trade && trade.length > 0 ? trade : row.legal_name;
}

async function loadLatestResultsByPatientId(
  supabase: Awaited<ReturnType<typeof getServerContext>>["supabase"],
  patientIds: string[],
): Promise<Map<string, ReturnType<typeof normalizeChildResults>>> {
  const latest = new Map<string, ReturnType<typeof normalizeChildResults>>();
  if (patientIds.length === 0) return latest;

  for (let i = 0; i < patientIds.length; i += ASSESSMENT_IN_CHUNK) {
    const chunk = patientIds.slice(i, i + ASSESSMENT_IN_CHUNK);
    const { data, error } = await supabase
      .from("patient_child_assessments")
      .select("patient_id, recorded_at, results")
      .in("patient_id", chunk)
      .order("recorded_at", { ascending: false });

    if (error || !data) continue;

    for (const row of data) {
      const patientId = String(row.patient_id ?? "");
      if (!patientId || latest.has(patientId)) continue;
      latest.set(patientId, normalizeChildResults(row.results));
    }
  }

  return latest;
}

export async function loadSchoolNutritionOverview(
  clientId: string,
  serieRaw?: string | null,
): Promise<SchoolNutritionOverviewLoad> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, owner_user_id, kind, business_segment, legal_name, trade_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.owner_user_id !== workspaceOwnerId) {
    return { ok: false, reason: "not_found" };
  }

  const row = client as ClientRow;
  if (row.kind !== "pj" || row.business_segment !== "escola") {
    return { ok: false, reason: "not_school" };
  }

  const [patientsRes, gradesRes, profileRes, estRes, tz] = await Promise.all([
    supabase
      .from("patients")
      .select("id, school_grade_id, birth_date")
      .eq("client_id", clientId),
    supabase
      .from("client_school_grades")
      .select("id, name, position")
      .eq("client_id", clientId)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("establishments")
      .select("id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    fetchProfileTimeZone(supabase, user.id),
  ]);

  const patients: SchoolOverviewPatient[] = (patientsRes.data ?? []).map((p) => ({
    id: String(p.id),
    schoolGradeId: p.school_grade_id ? String(p.school_grade_id) : null,
    birthDate: p.birth_date ? String(p.birth_date) : null,
  }));

  const grades: SchoolOverviewGrade[] = (gradesRes.data ?? []).map((g) => ({
    id: String(g.id),
    name: String(g.name),
    position: Number(g.position ?? 0),
  }));

  const latestResultsByPatientId = await loadLatestResultsByPatientId(
    supabase,
    patients.map((p) => p.id),
  );

  const today = todayKey(new Date(), tz);
  const now = parseCivilDate(today) ?? new Date();
  const filter = parseSchoolOverviewSerieParam(serieRaw);

  const overview = buildSchoolNutritionOverview({
    patients,
    latestResultsByPatientId,
    grades,
    filter,
    now,
  });

  const estId = estRes.data?.id ? String(estRes.data.id) : null;

  return {
    ok: true,
    clientId: row.id,
    clientName: clientDisplayName(row),
    patientsHref: estId
      ? `/clientes/${row.id}/estabelecimentos/${estId}/pacientes`
      : null,
    overview,
    professionalName: String(profileRes.data?.full_name ?? "").trim() || "—",
  };
}
