"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTeamJobRole } from "@/lib/constants/team-roles";
import { createClient } from "@/lib/supabase/server";
import type { ProfessionalArea, TeamMemberRow } from "@/lib/types/team-members";

function parseProfessionalArea(raw: unknown): ProfessionalArea | null {
  if (raw === "nutrition" || raw === "other") return raw;
  return null;
}

export async function loadTeamMembersForOwner(): Promise<{
  rows: TeamMemberRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("full_name", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as TeamMemberRow[] };
}

export async function loadTeamMemberById(
  id: string,
): Promise<{ row: TeamMemberRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error || !data) return { row: null };
  return { row: data as TeamMemberRow };
}

export async function createTeamMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const area = parseProfessionalArea(formData.get("professional_area"));
  const jobRole = parseTeamJobRole(formData.get("job_role"));
  const crnRaw = String(formData.get("crn") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!fullName || !area || !jobRole) {
    redirect("/equipe/nova?err=missing");
  }

  if (area === "nutrition" && !crnRaw) {
    redirect("/equipe/nova?err=crn");
  }

  const crn = crnRaw.length > 0 ? crnRaw : null;
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const { error } = await supabase.from("team_members").insert({
    owner_user_id: user.id,
    full_name: fullName,
    email: email.length > 0 ? email : null,
    phone: phone.length > 0 ? phone : null,
    professional_area: area,
    job_role: jobRole,
    crn: area === "nutrition" ? crn : null,
    notes,
  });

  if (error) {
    redirect("/equipe/nova?err=save");
  }

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}

export async function updateTeamMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/equipe?err=missing");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const area = parseProfessionalArea(formData.get("professional_area"));
  const jobRole = parseTeamJobRole(formData.get("job_role"));
  const crnRaw = String(formData.get("crn") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!fullName || !area || !jobRole) {
    redirect(`/equipe/${id}/editar?err=missing`);
  }

  if (area === "nutrition" && !crnRaw) {
    redirect(`/equipe/${id}/editar?err=crn`);
  }

  const crn = crnRaw.length > 0 ? crnRaw : null;
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const { error } = await supabase
    .from("team_members")
    .update({
      full_name: fullName,
      email: email.length > 0 ? email : null,
      phone: phone.length > 0 ? phone : null,
      professional_area: area,
      job_role: jobRole,
      crn: area === "nutrition" ? crn : null,
      notes,
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect(`/equipe/${id}/editar?err=save`);
  }

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}

export async function deleteTeamMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/equipe");

  await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  revalidatePath("/equipe");
  revalidatePath("/visitas");
  revalidatePath("/visitas/nova");
  redirect("/equipe");
}
