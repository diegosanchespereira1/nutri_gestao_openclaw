import { NextResponse } from "next/server";

import { loadAdultNutritionAssessmentsForPatient } from "@/lib/actions/adult-nutrition-assessments";
import { loadChildAssessmentsForPatient } from "@/lib/actions/child-assessments";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import { loadPatientById } from "@/lib/actions/patients";
import { ageYearsFromBirth, patientAgeCategory } from "@/lib/pacientes/age-category";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import {
  buildAdultNutritionAssessmentReportPdfBytes,
  type AdultReportHistoryRow,
  type AdultReportKpi,
} from "@/lib/pdf/adult-nutrition-assessment-report-pdf";
import { createClient } from "@/lib/supabase/server";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  PATIENT_GROUP_LABELS,
} from "@/lib/types/geriatric-assessments";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

function dateBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function initials(name: string): string {
  const parts = foldTextForPdf(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "NG";
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase() || "NG";
}

function latestKpis(row: AdultNutritionAssessmentRow): AdultReportKpi[] {
  return [
    { code: "CB", label: "Circ. braço", value: row.cb_cm != null ? `${fmt(row.cb_cm)} cm` : "–" },
    { code: "DCT", label: "Dobra tricipital", value: row.dct_mm != null ? `${fmt(row.dct_mm)} mm` : "–" },
    { code: "CP", label: "Circ. panturrilha", value: row.cp_cm != null ? `${fmt(row.cp_cm)} cm` : "–" },
    { code: "AJ", label: "Altura joelho", value: row.aj_cm != null ? `${fmt(row.aj_cm)} cm` : "–" },
    { code: "CMB", label: "Circ. muscular", value: row.cmb_cm != null ? `${fmt(row.cmb_cm)} cm` : "–" },
    {
      code: "PR",
      label: "Peso real",
      value: row.weight_real_kg != null ? `${fmt(row.weight_real_kg)} kg` : "–",
    },
    {
      code: "PE",
      label: "Peso estimado",
      value: row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–",
    },
    {
      code: "AE",
      label: "Altura estimada",
      value: row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–",
    },
    { code: "IMC", label: "IMC", value: row.bmi != null ? `${fmt(row.bmi)} kg/m²` : "–" },
    {
      code: "KCAL",
      label: "Energia prescrita",
      value: row.kcal_per_kg != null ? `${fmt(row.kcal_per_kg, 0)} kcal/kg` : "–",
    },
    {
      code: "PTN",
      label: "Proteína prescrita",
      value: row.ptn_per_kg != null ? `${fmt(row.ptn_per_kg)} g/kg` : "–",
    },
    {
      code: "NE",
      label: "Nec. energética",
      value:
        row.energy_needs_kcal != null
          ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")} kcal/dia`
          : "–",
    },
    {
      code: "NP",
      label: "Nec. proteica",
      value: row.protein_needs_g != null ? `${fmt(row.protein_needs_g)} g/dia` : "–",
    },
    {
      code: "RN",
      label: "Risco nutricional",
      value: row.nutritional_risk
        ? NUTRITIONAL_RISK_LABELS[row.nutritional_risk].split("—")[0]?.trim() ?? "–"
        : "–",
    },
    {
      code: "AMP",
      label: "Amputação",
      value: row.has_amputation
        ? `Sim${row.amputation_segment_pct != null ? ` (${fmt(row.amputation_segment_pct)}%)` : ""}`
        : "Não",
    },
  ];
}

function historyRows(rows: AdultNutritionAssessmentRow[]): AdultReportHistoryRow[] {
  return rows.map((row, idx) => ({
    dateLabel: dateBR(row.recorded_at),
    groupLabel: PATIENT_GROUP_LABELS[row.patient_group] ?? "–",
    peLabel: row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–",
    aeLabel: row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–",
    imcLabel: row.bmi != null ? fmt(row.bmi) : "–",
    neLabel:
      row.energy_needs_kcal != null
        ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")}`
        : "–",
    npLabel: row.protein_needs_g != null ? `${fmt(row.protein_needs_g)} g` : "–",
    riskLabel: row.nutritional_risk
      ? NUTRITIONAL_RISK_LABELS[row.nutritional_risk].split("—")[0]?.trim() ?? "–"
      : "–",
    current: idx === 0,
  }));
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/pacientes/${id}/indicadores/pdf`)}`,
    );
  }

  const [
    { row: patient },
    { rows: adultRows },
    { rows: geriatricRows },
    { rows: childRows },
    { data: profile },
  ] = await Promise.all([
    loadPatientById(id),
    loadAdultNutritionAssessmentsForPatient(id),
    loadGeriatricAssessmentsForPatient(id),
    loadChildAssessmentsForPatient(id),
    supabase
      .from("profiles")
      .select("full_name, crn")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!patient) return new NextResponse("Não encontrado", { status: 404 });

  let category = patientAgeCategory(patient.birth_date);
  if (!category) {
    if (geriatricRows.length > 0) category = "idoso";
    else if (childRows.length > 0) category = "crianca";
    else category = "adulto";
  }

  // Infantil: reutiliza o relatório especializado já existente
  if (category === "crianca") {
    if (childRows.length === 0) {
      return new NextResponse("Sem avaliações infantis para gerar o relatório.", {
        status: 404,
      });
    }
    return NextResponse.redirect(`${origin}/pacientes/${id}/relatorio-infantil/pdf`);
  }

  const isGeriatric = category === "idoso";
  const rows = isGeriatric ? geriatricRows : adultRows;
  if (rows.length === 0) {
    return new NextResponse(
      `Sem avaliações ${isGeriatric ? "geriátricas" : "de adultos"} para gerar o relatório.`,
      { status: 404 },
    );
  }

  let logoBuffer: Buffer | null = null;
  try {
    const path = await fetchTenantLogoStoragePath(supabase);
    const url = await getTenantLogoSignedUrl(supabase, path);
    if (url) {
      const res = await fetch(url);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    logoBuffer = null;
  }

  const { data: tenantNameRaw } = await supabase.rpc("workspace_tenant_name");
  const tenantName =
    (typeof tenantNameRaw === "string" && tenantNameRaw.trim()) ||
    String(profile?.full_name ?? "Relatório nutricional");

  const ageYears = ageYearsFromBirth(patient.birth_date);
  const latest = rows[0];

  const bytes = await buildAdultNutritionAssessmentReportPdfBytes({
    tenantName,
    tenantInitials: initials(tenantName),
    logoBuffer,
    emittedAtLabel: dateBR(new Date().toISOString()),
    modeLabel: isGeriatric ? "Avaliação para idosos" : "Avaliação adultos",
    patient: {
      name: patient.full_name,
      birthLabel: patient.birth_date ? dateBR(patient.birth_date) : "Não informada",
      ageLabel: ageYears != null ? `${ageYears} anos` : "Idade não informada",
      sexLabel: patient.sex ? SEX_LABEL[patient.sex] ?? "—" : "—",
    },
    latestKpis: latestKpis(latest),
    history: historyRows(rows),
    professionalName: String(profile?.full_name ?? "—"),
    crn: String(profile?.crn ?? ""),
    clinicalNotes: latest.clinical_notes,
    diagnosis: latest.nutritional_diagnosis,
  });

  const slug = foldTextForPdf(patient.full_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-indicadores-${slug || "paciente"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
